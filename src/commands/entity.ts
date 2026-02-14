import type { Command } from 'commander';
import { collectAllPages } from '../utils/pagination';
import { parseJsonArg } from '../utils/parse-json';
import { compileEntity } from '../utils/compiled-entity';
import { resolveInteractionPersons, type ResolvePersonById } from '../utils/interaction-resolution';
import {
  resolveRecordIdField,
  resolveRecordsIdField,
  resolveNestedArrayForeignKeyField,
  resolveIdList,
  summarizeOpportunityResolvedReference,
  summarizeOpportunityReference,
  summarizeInteractionPersonReference,
  summarizeListReference,
  summarizeOrganizationReference,
  summarizePersonReference,
  type ResolveEntityById
} from '../utils/reference-resolution';
import { output, readOutputOptions } from './common';
import type { EntitiesEndpoint } from '../api/endpoints/entities';
import type { AffinityEntity } from '../api/types';

type MatchKey = 'email' | 'domain' | 'name';
type EntityRecord = Record<string, unknown>;
type ResolveRelationshipStrengthsByExternalId = (
  externalId: string
) => Promise<Array<Record<string, unknown>>>;
type InteractionType =
  | 'first_email'
  | 'last_email'
  | 'last_interaction'
  | 'last_event'
  | 'first_event'
  | 'next_event';

const interactionTypes: InteractionType[] = [
  'first_email',
  'last_email',
  'last_interaction',
  'last_event',
  'first_event',
  'next_event'
];

const findMatch = (
  records: EntityRecord[],
  key: MatchKey,
  value: string
): EntityRecord | undefined => {
  const lower = value.toLowerCase();

  return records.find((record) => {
    const typed = record as Record<string, unknown>;
    if (key === 'email') {
      const raw = typed.email_addresses;
      const emails: string[] = Array.isArray(raw)
        ? raw.filter((v): v is string => typeof v === 'string')
        : [];
      return emails.some((email) => email.toLowerCase() === lower);
    }
    const field = typed[key];
    return typeof field === 'string' && field.toLowerCase() === lower;
  });
};

const resolveOrganizationPersons = async (
  entity: EntityRecord,
  resolvePersonById: ResolvePersonById
): Promise<EntityRecord> => {
  return resolveRecordIdField(entity, {
    idsField: 'person_ids',
    targetField: 'persons',
    resolveById: resolvePersonById,
    buildSummary: summarizePersonReference
  });
};

const resolveOpportunityListEntries = async (
  entity: EntityRecord,
  resolveListById: ResolveEntityById
): Promise<EntityRecord> => {
  const opportunitiesValue = entity.opportunities;
  if (!Array.isArray(opportunitiesValue)) return entity;
  const opportunities: unknown[] = opportunitiesValue;

  const resolvedOpportunities = await Promise.all(
    opportunities.map(async (opportunity) => {
      if (!opportunity || typeof opportunity !== 'object' || Array.isArray(opportunity)) {
        return opportunity;
      }
      return resolveNestedArrayForeignKeyField(opportunity as EntityRecord, {
        arrayField: 'list_entries',
        idField: 'list_id',
        targetField: 'list',
        resolveById: resolveListById,
        buildSummary: summarizeListReference,
        dropSourceField: false
      });
    })
  );

  return {
    ...entity,
    opportunities: resolvedOpportunities
  };
};

const toId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

const enrichRelationshipStrengths = async (
  personId: string,
  resolveRelationshipStrengthsByExternalId: ResolveRelationshipStrengthsByExternalId,
  resolvePersonById?: ResolvePersonById
): Promise<Array<Record<string, unknown>>> => {
  const strengths = await resolveRelationshipStrengthsByExternalId(personId);
  if (!resolvePersonById || strengths.length === 0) return strengths;

  const internalIds = Array.from(
    new Set(
      strengths
        .map((item) => toId(item.internal_id))
        .filter((id): id is string => typeof id === 'string')
    )
  );
  const resolvedPeople = await resolveIdList(
    internalIds,
    resolvePersonById,
    summarizeInteractionPersonReference
  );
  const personById = new Map(
    resolvedPeople
      .map((person) => {
        const id = toId(person.id);
        return id ? ([id, person] as const) : undefined;
      })
      .filter((entry): entry is readonly [string, Record<string, unknown>] => Boolean(entry))
  );

  return strengths.map((item) => {
    const internalId = toId(item.internal_id);
    if (!internalId) return item;
    return {
      ...item,
      internal_person: personById.get(internalId) ?? { id: internalId }
    };
  });
};

export const registerEntityCommands = (
  program: Command,
  name: 'person' | 'organization' | 'opportunity',
  endpoint: EntitiesEndpoint,
  resolveInteractionPersonById?: ResolvePersonById,
  resolveOrganizationById?: ResolveEntityById,
  resolveOpportunityById?: ResolveEntityById,
  resolveListById?: ResolveEntityById,
  resolveRelationshipStrengthsByExternalId?: ResolveRelationshipStrengthsByExternalId
): void => {
  const cmd = program.command(name).description(`${name} management commands`);

  const searchCommand = cmd
    .command('search')
    .option('--term <query>', 'Search term')
    .option('--all', 'Auto-paginate all records')
    .option('--page-size <n>', 'Page size', (value) => Number.parseInt(value, 10), 25)
    .option('--page-token <token>', 'Starting page token')
    .option('--with-interactions', 'Include interaction dates and interaction persons')
    .option('--with-opportunities', 'Include opportunity IDs when supported');

  if (name === 'person') {
    searchCommand.option(
      '--with-current-organizations',
      'Include current organizations (person endpoints)'
    );
  }

  searchCommand
    .option('--min-first-email-date <iso>', 'Minimum first_email date (ISO 8601)')
    .option('--max-first-email-date <iso>', 'Maximum first_email date (ISO 8601)')
    .option('--min-last-email-date <iso>', 'Minimum last_email date (ISO 8601)')
    .option('--max-last-email-date <iso>', 'Maximum last_email date (ISO 8601)')
    .option('--min-last-interaction-date <iso>', 'Minimum last_interaction date (ISO 8601)')
    .option('--max-last-interaction-date <iso>', 'Maximum last_interaction date (ISO 8601)')
    .option('--min-last-event-date <iso>', 'Minimum last_event date (ISO 8601)')
    .option('--max-last-event-date <iso>', 'Maximum last_event date (ISO 8601)')
    .option('--min-first-event-date <iso>', 'Minimum first_event date (ISO 8601)')
    .option('--max-first-event-date <iso>', 'Maximum first_event date (ISO 8601)')
    .option('--min-next-event-date <iso>', 'Minimum next_event date (ISO 8601)')
    .option('--max-next-event-date <iso>', 'Maximum next_event date (ISO 8601)')
    .option('--domain <domain>', 'Exact domain lookup (performed server-side using term=<domain>)')
    .option('--query <json>', 'Additional raw query params JSON passed to API')
    .action(async function onAction(options: {
      term?: string;
      all?: boolean;
      pageSize?: number;
      pageToken?: string;
      withInteractions?: boolean;
      withOpportunities?: boolean;
      withCurrentOrganizations?: boolean;
      minFirstEmailDate?: string;
      maxFirstEmailDate?: string;
      minLastEmailDate?: string;
      maxLastEmailDate?: string;
      minLastInteractionDate?: string;
      maxLastInteractionDate?: string;
      minLastEventDate?: string;
      maxLastEventDate?: string;
      minFirstEventDate?: string;
      maxFirstEventDate?: string;
      minNextEventDate?: string;
      maxNextEventDate?: string;
      domain?: string;
      query?: string;
    }) {
      const outputOptions = readOutputOptions(this);
      const allowOrganizationResolution = !(name === 'organization' && outputOptions.compact);
      const allowOpportunityResolution = !outputOptions.compact;

      if (!options.term && !options.domain) {
        throw new Error('At least one of --term or --domain is required');
      }

      const includeInteractions = Boolean(options.withInteractions);
      const includeInteractionDates = includeInteractions;
      const includeInteractionPersons = includeInteractions;

      const queryParams = options.query
        ? parseJsonArg<Record<string, unknown>>(options.query, '--query')
        : {};

      const extraParams: Record<string, unknown> = {
        ...queryParams,
        with_interaction_dates: includeInteractionDates,
        with_interaction_persons: includeInteractionPersons,
        with_opportunities: options.withOpportunities,
        with_current_organizations: options.withCurrentOrganizations
      };
      for (const interactionType of interactionTypes) {
        const camel = interactionType
          .split('_')
          .map((part, index) => (index === 0 ? part : `${part[0]?.toUpperCase()}${part.slice(1)}`))
          .join('');
        const minKey = `min${camel[0]?.toUpperCase()}${camel.slice(1)}Date` as keyof typeof options;
        const maxKey = `max${camel[0]?.toUpperCase()}${camel.slice(1)}Date` as keyof typeof options;
        const minValue = options[minKey];
        const maxValue = options[maxKey];
        if (typeof minValue === 'string') {
          extraParams[`min_${interactionType}_date`] = minValue;
        }
        if (typeof maxValue === 'string') {
          extraParams[`max_${interactionType}_date`] = maxValue;
        }
      }

      const effectiveTerm = options.domain ?? options.term;
      const runPage = async (pageToken?: string) =>
        endpoint.search(effectiveTerm, pageToken, options.pageSize, extraParams);

      let records: EntityRecord[] = options.all
        ? ((await collectAllPages((pageToken) =>
            runPage(pageToken ?? options.pageToken)
          )) as EntityRecord[])
        : ((await runPage(options.pageToken)).items as EntityRecord[]);

      if (options.domain) {
        const domain = options.domain.toLowerCase();
        records = records.filter((entry) => {
          const typed = entry as Record<string, unknown>;
          const primary = typed.domain;
          const aliases = typed.domains;
          const primaryMatch = typeof primary === 'string' && primary.toLowerCase() === domain;
          const aliasMatch =
            Array.isArray(aliases) &&
            aliases.some((item) => typeof item === 'string' && item.toLowerCase() === domain);
          return primaryMatch || aliasMatch;
        });
      }

      if (
        includeInteractionPersons &&
        resolveInteractionPersonById &&
        allowOrganizationResolution
      ) {
        records = await resolveInteractionPersons(
          records,
          resolveInteractionPersonById,
          summarizeInteractionPersonReference
        );
      }
      if (name === 'person' && options.withCurrentOrganizations && resolveOrganizationById) {
        records = await resolveRecordsIdField(records, {
          idsField: 'current_organization_ids',
          targetField: 'current_organizations',
          resolveById: resolveOrganizationById,
          buildSummary: summarizeOrganizationReference
        });
      }
      if (options.withOpportunities && resolveOpportunityById && allowOpportunityResolution) {
        records = await resolveRecordsIdField(records, {
          idsField: 'opportunity_ids',
          targetField: 'opportunities',
          resolveById: resolveOpportunityById,
          buildSummary: summarizeOpportunityReference
        });
      }

      output(this, records);
    });

  const getCommand = cmd.command('get').argument('<id>', `${name} ID`);

  if (name === 'person') {
    getCommand.option(
      '--detailed',
      'Resolve linked references (organizations, lists, interaction persons, opportunities)'
    );
    getCommand.option('--full', 'Detailed person output plus relationship strengths');
  }
  if (name === 'organization') {
    getCommand.option(
      '--detailed',
      'Include interaction metadata and resolve linked persons/opportunities'
    );
    getCommand.option('--full', 'Detailed organization output plus normalized field values');
  }

  if (name !== 'organization') {
    getCommand.option('--compiled', 'Get entity merged with field values (legacy alias)');
    getCommand
      .option('--with-fields', 'Include normalized field values keyed by field name')
      .option('--with-interactions', 'Include interaction dates and interaction persons')
      .option('--with-opportunities', 'Include opportunity IDs when supported');
  }
  if (name === 'person') {
    getCommand.option(
      '--with-current-organizations',
      'Include current organizations (person endpoints)'
    );
  }

  getCommand
    .option('--query <json>', 'Additional raw query params JSON passed to API')
    .action(async function onAction(
      id: string,
      options: {
        detailed?: boolean;
        full?: boolean;
        compiled?: boolean;
        withFields?: boolean;
        withInteractions?: boolean;
        withOpportunities?: boolean;
        withCurrentOrganizations?: boolean;
        query?: string;
      }
    ) {
      const outputOptions = readOutputOptions(this);
      const isOrganization = name === 'organization';
      const includeDetailed = name === 'person' && Boolean(options.detailed);
      const includeFull = name === 'person' && Boolean(options.full);
      const includeResolvedDetails = includeDetailed || includeFull;
      const includeOrganizationDetailed =
        isOrganization && Boolean(options.detailed || options.full);
      const includeOrganizationFull = isOrganization && Boolean(options.full);
      const allowOrganizationResolution = isOrganization
        ? includeOrganizationDetailed && !outputOptions.compact
        : !outputOptions.compact || includeResolvedDetails;
      const allowOpportunityResolution = isOrganization
        ? includeOrganizationDetailed && !outputOptions.compact
        : !outputOptions.compact || includeResolvedDetails;

      const includeInteractions = isOrganization
        ? includeOrganizationDetailed
        : Boolean(options.withInteractions) || includeResolvedDetails;
      const includeInteractionDates = includeInteractions;
      const includeInteractionPersons = includeInteractions;
      const includeOpportunities = isOrganization
        ? includeOrganizationDetailed
        : options.withOpportunities || includeResolvedDetails;
      const includeCurrentOrganizations =
        name === 'person'
          ? Boolean(options.withCurrentOrganizations) || includeResolvedDetails
          : options.withCurrentOrganizations;

      const queryParams = options.query
        ? parseJsonArg<Record<string, unknown>>(options.query, '--query')
        : {};

      const entity = await endpoint.get(id, {
        ...queryParams,
        with_interaction_dates: includeInteractionDates,
        with_interaction_persons: includeInteractionPersons,
        with_opportunities: includeOpportunities,
        with_current_organizations: includeCurrentOrganizations
      });

      let entityOutput: EntityRecord = entity as EntityRecord;
      if (
        includeInteractionPersons &&
        resolveInteractionPersonById &&
        allowOrganizationResolution
      ) {
        const resolved = await resolveInteractionPersons(
          [entityOutput],
          resolveInteractionPersonById,
          summarizeInteractionPersonReference
        );
        entityOutput = resolved[0] ?? entityOutput;
      }
      if (name === 'organization' && resolveInteractionPersonById && allowOrganizationResolution) {
        entityOutput = await resolveOrganizationPersons(entityOutput, resolveInteractionPersonById);
      }
      if (name === 'person' && resolveOrganizationById && includeResolvedDetails) {
        entityOutput = await resolveRecordIdField(entityOutput, {
          idsField: 'current_organization_ids',
          targetField: 'current_organizations',
          resolveById: resolveOrganizationById,
          buildSummary: summarizeOrganizationReference
        });
        entityOutput = await resolveRecordIdField(entityOutput, {
          idsField: 'organization_ids',
          targetField: 'organizations',
          resolveById: resolveOrganizationById,
          buildSummary: summarizeOrganizationReference
        });
        if (resolveListById) {
          entityOutput = await resolveNestedArrayForeignKeyField(entityOutput, {
            arrayField: 'list_entries',
            idField: 'list_id',
            targetField: 'list',
            resolveById: resolveListById,
            buildSummary: summarizeListReference,
            dropSourceField: false
          });
        }
      }
      if (includeOpportunities && resolveOpportunityById && allowOpportunityResolution) {
        entityOutput = await resolveRecordIdField(entityOutput, {
          idsField: 'opportunity_ids',
          targetField: 'opportunities',
          resolveById: resolveOpportunityById,
          buildSummary: summarizeOpportunityResolvedReference
        });
        if (resolveListById) {
          entityOutput = await resolveOpportunityListEntries(entityOutput, resolveListById);
        }
      }
      if (includeFull && resolveRelationshipStrengthsByExternalId) {
        entityOutput.relationship_strengths = await enrichRelationshipStrengths(
          id,
          resolveRelationshipStrengthsByExternalId,
          resolveInteractionPersonById
        );
      }
      const shouldIncludeFields = isOrganization
        ? includeOrganizationFull
        : Boolean(options.withFields) || Boolean(options.compiled);
      if (!shouldIncludeFields) {
        output(this, entityOutput);
        return;
      }
      const [fieldValues, fields] = await Promise.all([
        endpoint.getFieldValues(id),
        endpoint.getFieldDefinitions()
      ]);
      output(
        this,
        await compileEntity(
          entityOutput as AffinityEntity,
          fieldValues,
          fields,
          resolveInteractionPersonById
        )
      );
    });

  cmd
    .command('create')
    .requiredOption('--data <json>', 'JSON body for create')
    .action(async function onAction(options: { data: string }) {
      const payload = parseJsonArg<Record<string, unknown>>(options.data, '--data');
      output(this, await endpoint.create(payload));
    });

  cmd
    .command('update')
    .argument('<id>', `${name} ID`)
    .requiredOption('--data <json>', 'JSON body for update')
    .action(async function onAction(id: string, options: { data: string }) {
      const payload = parseJsonArg<Record<string, unknown>>(options.data, '--data');
      output(this, await endpoint.update(id, payload));
    });

  cmd
    .command('assert')
    .requiredOption('--matching <field>', 'Matching key: email|domain|name')
    .requiredOption('--data <json>', 'JSON payload for assert')
    .action(async function onAction(options: { matching: MatchKey; data: string }) {
      if (!['email', 'domain', 'name'].includes(options.matching)) {
        throw new Error('--matching must be one of email|domain|name');
      }

      const payload = parseJsonArg<Record<string, unknown>>(options.data, '--data');
      const key = options.matching;
      const directValue = payload[key];
      const pluralValues = payload[`${key}s`];
      const matchValue =
        typeof directValue === 'string'
          ? directValue
          : Array.isArray(pluralValues)
            ? pluralValues.find((value): value is string => typeof value === 'string')
            : undefined;

      if (!matchValue || typeof matchValue !== 'string') {
        throw new Error(`Missing string value for matching key ${key} in --data payload`);
      }

      const matches = await collectAllPages((pageToken) => endpoint.search(matchValue, pageToken));
      const existing = findMatch(matches as EntityRecord[], key, matchValue);

      if (!existing) {
        output(this, await endpoint.create(payload));
        return;
      }

      output(this, await endpoint.update(String(existing.id), payload));
    });
};
