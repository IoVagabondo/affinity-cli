import type { Command } from 'commander';
import type { EntriesEndpoint } from '../api/endpoints/entries';
import type { FieldValuesEndpoint } from '../api/endpoints/fieldValues';
import type { ListsEndpoint } from '../api/endpoints/lists';
import type { PersonsEndpoint } from '../api/endpoints/persons';
import { collectAllPages } from '../utils/pagination';
import { output, readOutputOptions } from './common';

type ListTypeValue = string | number | undefined;

const listTypeLabel = (value: ListTypeValue): string => {
  if (value === 0 || value === '0') return 'person';
  if (value === 1 || value === '1') return 'organization';
  if (value === 8 || value === '8') return 'opportunity';
  if (value === undefined) return 'unknown';
  return String(value);
};

const personTypeLabel = (value: ListTypeValue): string => {
  if (value === 0 || value === '0') return 'external';
  if (value === 1 || value === '1') return 'internal';
  if (value === undefined) return 'unknown';
  return String(value);
};

const toIdValue = (value: unknown): string | number | undefined =>
  typeof value === 'string' || typeof value === 'number' ? value : undefined;

const resolvePersonSummary = async (
  persons: PersonsEndpoint,
  idValue: string | number | undefined
): Promise<Record<string, unknown> | undefined> => {
  if (idValue === undefined) return undefined;

  const idString = String(idValue);
  const fallback = { id: idString };

  try {
    const person = (await persons.get(idString)) as Record<string, unknown>;
    const personTypeValue = toIdValue(person.type);
    const firstName = typeof person.first_name === 'string' ? person.first_name : undefined;
    const lastName = typeof person.last_name === 'string' ? person.last_name : undefined;

    return {
      ...fallback,
      type: {
        type_value: personTypeValue,
        type_string: personTypeLabel(personTypeValue)
      },
      first_name: firstName,
      last_name: lastName,
      name: [firstName, lastName].filter((value): value is string => Boolean(value)).join(' '),
      primary_email: typeof person.primary_email === 'string' ? person.primary_email : undefined,
      emails: Array.isArray(person.emails)
        ? person.emails.filter((value): value is string => typeof value === 'string')
        : undefined
    };
  } catch {
    return fallback;
  }
};

const summarizeEntityTypes = (entries: Array<Record<string, unknown>>): Record<string, number> => {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    const type = entry.entity_type;
    const key = listTypeLabel(
      typeof type === 'string' || typeof type === 'number' ? type : undefined
    );
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Object.fromEntries(counts);
};

type ListFieldDefinition = {
  id: string;
  name: string;
  valueType: string | number | undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const extractListFieldDefinitions = (
  fields: Array<Record<string, unknown>>
): ListFieldDefinition[] =>
  fields
    .map((field) => {
      const fieldId = toIdValue(field.id);
      const fieldName = typeof field.name === 'string' ? field.name : undefined;
      if (fieldId === undefined || fieldName === undefined) return undefined;
      return {
        id: String(fieldId),
        name: fieldName,
        valueType: toIdValue(field.value_type)
      };
    })
    .filter(
      (field): field is { id: string; name: string; valueType: string | number | undefined } =>
        field !== undefined
    );

const normalizeFieldValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => normalizeFieldValue(item));
  if (!value || typeof value !== 'object') return value;

  const obj = value as Record<string, unknown>;
  if (typeof obj.text === 'string') return obj.text;
  if (typeof obj.title === 'string') return obj.title;
  if (typeof obj.name === 'string') return obj.name;
  return obj;
};

const isPersonReferenceField = (valueType: string | number | undefined): boolean =>
  valueType === 0 || valueType === '0';

const resolvePersonLabel = async (
  persons: PersonsEndpoint,
  personId: string,
  cache: Map<string, string>
): Promise<string> => {
  const cached = cache.get(personId);
  if (cached) return cached;

  try {
    const person = (await persons.get(personId)) as Record<string, unknown>;
    const firstName = typeof person.first_name === 'string' ? person.first_name : undefined;
    const lastName = typeof person.last_name === 'string' ? person.last_name : undefined;
    const fullName = [firstName, lastName]
      .filter((value): value is string => Boolean(value))
      .join(' ');
    const label =
      fullName ||
      (typeof person.name === 'string' ? person.name : undefined) ||
      (typeof person.primary_email === 'string' ? person.primary_email : undefined) ||
      personId;
    cache.set(personId, label);
    return label;
  } catch {
    cache.set(personId, personId);
    return personId;
  }
};

const resolveFieldValue = async (
  value: unknown,
  field: ListFieldDefinition,
  persons: PersonsEndpoint,
  personLabelCache: Map<string, string>
): Promise<unknown> => {
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((item) => resolveFieldValue(item, field, persons, personLabelCache))
    );
  }

  const normalized = normalizeFieldValue(value);
  if (!isPersonReferenceField(field.valueType)) return normalized;

  if (typeof normalized === 'string' || typeof normalized === 'number') {
    return resolvePersonLabel(persons, String(normalized), personLabelCache);
  }

  return normalized;
};

const buildEntryFields = async (
  fieldDefinitions: ListFieldDefinition[],
  values: Array<Record<string, unknown>>,
  persons: PersonsEndpoint,
  personLabelCache: Map<string, string>
): Promise<Record<string, unknown>> => {
  const valueBuckets = new Map<string, unknown[]>();

  for (const valueRecord of values) {
    const fieldId = toIdValue(valueRecord.field_id);
    if (fieldId === undefined) continue;

    const key = String(fieldId);
    const nextValue = normalizeFieldValue(valueRecord.value);
    const bucket = valueBuckets.get(key);
    if (bucket) {
      bucket.push(nextValue);
    } else {
      valueBuckets.set(key, [nextValue]);
    }
  }

  const out: Record<string, unknown> = {};
  for (const field of fieldDefinitions) {
    const bucket = valueBuckets.get(field.id);
    if (!bucket || bucket.length === 0) {
      out[field.name] = null;
    } else {
      const resolvedValues = await Promise.all(
        bucket.map((value) => resolveFieldValue(value, field, persons, personLabelCache))
      );
      out[field.name] = resolvedValues.length === 1 ? resolvedValues[0] : resolvedValues;
    }
  }

  return out;
};

const enrichEntriesWithFields = async (
  entryItems: Array<Record<string, unknown>>,
  fieldDefinitions: ListFieldDefinition[],
  fieldValues: FieldValuesEndpoint,
  persons: PersonsEndpoint
): Promise<Array<Record<string, unknown>>> => {
  const emptyFields = Object.fromEntries(fieldDefinitions.map((field) => [field.name, null]));
  if (fieldDefinitions.length === 0) {
    return entryItems.map((entry) => ({ ...entry, fields: emptyFields }));
  }

  const personLabelCache = new Map<string, string>();
  return Promise.all(
    entryItems.map(async (entry) => {
      const entryId = toIdValue(entry.id);
      if (entryId === undefined) return { ...entry, fields: emptyFields };

      const values = await collectAllPages((pageToken) =>
        fieldValues.list({ entryId: String(entryId), pageToken })
      );
      const typedValues = values as Array<Record<string, unknown>>;
      return {
        ...entry,
        fields: await buildEntryFields(fieldDefinitions, typedValues, persons, personLabelCache)
      };
    })
  );
};

const hasDisplayValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const toTabularValue = (value: unknown): string | number | boolean | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => toTabularValue(entry))
      .filter((entry) => entry !== null)
      .join(', ');
  }
  if (isRecord(value)) {
    if (typeof value.name === 'string') return value.name;
    if (typeof value.title === 'string') return value.title;
    if (typeof value.text === 'string') return value.text;
  }
  return JSON.stringify(value);
};

const tabularizeEntries = (
  entriesToFormat: Array<Record<string, unknown>>
): Array<Record<string, unknown>> => {
  const fieldColumns = Array.from(
    new Set(
      entriesToFormat.flatMap((entry) => {
        const fields = entry.fields;
        if (!isRecord(fields)) return [];
        return Object.entries(fields)
          .filter(([, value]) => hasDisplayValue(value))
          .map(([key]) => key);
      })
    )
  );

  return entriesToFormat.map((entry) => {
    const row: Record<string, unknown> = {
      id: entry.id,
      list_id: entry.list_id,
      entity_id: entry.entity_id,
      entity_type: listTypeLabel(toIdValue(entry.entity_type)),
      entity_name:
        isRecord(entry.entity) && typeof entry.entity.name === 'string' ? entry.entity.name : null,
      created_at: entry.created_at
    };

    const fields = isRecord(entry.fields) ? entry.fields : {};
    for (const fieldName of fieldColumns) {
      row[fieldName] = toTabularValue(fields[fieldName]) ?? '';
    }
    return row;
  });
};

const buildEntriesPagination = (input: {
  mode: 'page' | 'all';
  listId: string;
  pageSize: number;
  requestedPageToken?: string;
  nextPageToken?: string | null;
  pagesFetched: number;
  returnedCount: number;
  listSize?: number;
  entityTypeBreakdown: Record<string, number>;
}): Record<string, unknown> => ({
  mode: input.mode,
  list_id: input.listId,
  page_size: input.pageSize,
  requested_page_token: input.requestedPageToken ?? null,
  next_page_token: input.nextPageToken ?? null,
  has_more: Boolean(input.nextPageToken),
  pages_fetched: input.pagesFetched,
  returned_count: input.returnedCount,
  ...(typeof input.listSize === 'number' ? { list_size: input.listSize } : {}),
  entity_type_breakdown: input.entityTypeBreakdown
});

export const registerListCommands = (
  program: Command,
  lists: ListsEndpoint,
  entries: EntriesEndpoint,
  persons: PersonsEndpoint,
  fieldValues: FieldValuesEndpoint
): void => {
  const cmd = program.command('list').description('List management commands');

  cmd
    .command('list-all')
    .option('--all', 'Auto-paginate')
    .action(async function onAction(options: { all?: boolean }) {
      const records = options.all
        ? await collectAllPages((pageToken) => lists.listAll(pageToken))
        : (await lists.listAll()).items;
      output(this, records);
    });

  cmd
    .command('get')
    .argument('<id>', 'List ID')
    .option('--include-fields', 'Include full fields payload')
    .option('--with-entries', 'Include entries in response')
    .option('--entries-all', 'Fetch all entries when using --with-entries')
    .option(
      '--entries-page-size <n>',
      'Entries page size',
      (value) => Number.parseInt(value, 10),
      25
    )
    .option('--entries-page-token <token>', 'Starting entries page token')
    .action(async function onAction(
      id: string,
      options: {
        includeFields?: boolean;
        withEntries?: boolean;
        entriesAll?: boolean;
        entriesPageSize?: number;
        entriesPageToken?: string;
      }
    ) {
      const list = (await lists.get(id)) as Record<string, unknown>;
      const fields = Array.isArray(list.fields)
        ? (list.fields as Array<Record<string, unknown>>)
        : [];
      const owner = await resolvePersonSummary(persons, toIdValue(list.owner_id));
      const typeValue =
        typeof list.type === 'number' || typeof list.type === 'string'
          ? list.type
          : typeof list.entity_type === 'number' || typeof list.entity_type === 'string'
            ? list.entity_type
            : undefined;

      const summary: Record<string, unknown> = {
        id: list.id,
        name: list.name,
        type: {
          type_value: typeValue,
          type_string: listTypeLabel(typeValue)
        },
        public: list.public,
        owner,
        creator_id: list.creator_id,
        list_size: list.list_size,
        field_count: fields.length,
        field_names: fields
          .map((field) => field.name)
          .filter((value): value is string => typeof value === 'string')
      };

      if (options.includeFields) {
        summary.fields = fields;
      }

      if (options.withEntries) {
        const fieldDefinitions = extractListFieldDefinitions(fields);
        if (options.entriesAll) {
          const firstToken = options.entriesPageToken;
          const allEntries = await collectAllPages((pageToken) =>
            entries.list(id, pageToken ?? firstToken, options.entriesPageSize)
          );
          const typedEntries = allEntries as Array<Record<string, unknown>>;
          const enrichedEntries = await enrichEntriesWithFields(
            typedEntries,
            fieldDefinitions,
            fieldValues,
            persons
          );
          summary.entries = {
            mode: 'all',
            page_size: options.entriesPageSize,
            fetched: typedEntries.length,
            entity_type_breakdown: summarizeEntityTypes(typedEntries),
            items: enrichedEntries
          };
        } else {
          const page = await entries.list(id, options.entriesPageToken, options.entriesPageSize);
          const typedEntries = page.items as Array<Record<string, unknown>>;
          const enrichedEntries = await enrichEntriesWithFields(
            typedEntries,
            fieldDefinitions,
            fieldValues,
            persons
          );
          summary.entries = {
            mode: 'page',
            page_size: options.entriesPageSize,
            fetched: typedEntries.length,
            next_page_token: page.nextPageToken,
            entity_type_breakdown: summarizeEntityTypes(typedEntries),
            items: enrichedEntries
          };
        }
      }

      output(this, summary);
    });

  cmd
    .command('create')
    .requiredOption('--name <name>', 'List name')
    .requiredOption('--type <type>', 'Entity type person|organization|opportunity')
    .option('--public', 'Create as public list')
    .action(async function onAction(options: {
      name: string;
      type: 'person' | 'organization' | 'opportunity';
      public?: boolean;
    }) {
      output(
        this,
        await lists.create({ name: options.name, type: options.type, isPrivate: !options.public })
      );
    });

  cmd
    .command('entries')
    .argument('<list-id>', 'List ID')
    .option('--all', 'Auto-paginate all entries')
    .option('--page-size <n>', 'Page size', (value) => Number.parseInt(value, 10), 25)
    .option('--page-token <token>', 'Starting page token')
    .action(async function onAction(
      listId: string,
      options: { all?: boolean; pageSize?: number; pageToken?: string }
    ) {
      const outputOptions = readOutputOptions(this);
      const pageSize = options.pageSize ?? 25;
      const list = (await lists.get(listId)) as Record<string, unknown>;
      const listFields = Array.isArray(list.fields)
        ? (list.fields as Array<Record<string, unknown>>)
        : [];
      const fieldDefinitions = extractListFieldDefinitions(listFields);
      const listSize = typeof list.list_size === 'number' ? list.list_size : undefined;

      if (options.all) {
        let pageToken: string | undefined = options.pageToken;
        let pagesFetched = 0;
        const records: Array<Record<string, unknown>> = [];

        // Fetch all pages while preserving first-token support and metadata.
        while (true) {
          const page = await entries.list(listId, pageToken, pageSize);
          pagesFetched += 1;
          records.push(...(page.items as Array<Record<string, unknown>>));
          if (!page.nextPageToken) break;
          pageToken = page.nextPageToken;
        }

        const enriched = await enrichEntriesWithFields(
          records,
          fieldDefinitions,
          fieldValues,
          persons
        );
        if (outputOptions.format === 'json') {
          output(this, {
            pagination: buildEntriesPagination({
              mode: 'all',
              listId,
              pageSize,
              requestedPageToken: options.pageToken,
              pagesFetched,
              returnedCount: records.length,
              listSize,
              entityTypeBreakdown: summarizeEntityTypes(records)
            }),
            data: enriched
          });
          return;
        }
        output(this, tabularizeEntries(enriched));
        return;
      }

      const page = await entries.list(listId, options.pageToken, pageSize);
      const typedRecords = page.items as Array<Record<string, unknown>>;
      const enriched = await enrichEntriesWithFields(
        typedRecords,
        fieldDefinitions,
        fieldValues,
        persons
      );
      if (outputOptions.format === 'json') {
        output(this, {
          pagination: buildEntriesPagination({
            mode: 'page',
            listId,
            pageSize,
            requestedPageToken: options.pageToken,
            nextPageToken: page.nextPageToken,
            pagesFetched: 1,
            returnedCount: typedRecords.length,
            listSize,
            entityTypeBreakdown: summarizeEntityTypes(typedRecords)
          }),
          data: enriched
        });
        return;
      }
      output(this, tabularizeEntries(enriched));
    });

  cmd
    .command('get-entry')
    .argument('<list-id>', 'List ID')
    .argument('<entry-id>', 'Entry ID')
    .action(async function onAction(listId: string, entryId: string) {
      output(this, await entries.get(listId, entryId));
    });

  cmd
    .command('add-entry')
    .argument('<list-id>', 'List ID')
    .requiredOption('--entity-id <id>', 'Entity ID')
    .action(async function onAction(listId: string, options: { entityId: string }) {
      output(this, await entries.add(listId, options.entityId));
    });

  cmd
    .command('delete-entry')
    .argument('<list-id>', 'List ID')
    .argument('<entry-id>', 'Entry ID')
    .action(async function onAction(listId: string, entryId: string) {
      output(this, await entries.delete(listId, entryId));
    });
};
