import type { Command } from 'commander';
import type { NoteListParams, NotesEndpoint } from '../api/endpoints/notes';
import { truncateText, withTruncatedNoteContent } from '../utils/note-content';
import { parseJsonArg } from '../utils/parse-json';
import {
  resolveNoteByMode,
  resolveNotesByMode,
  type NoteDetailMode,
  type NoteResolutionDependencies
} from '../utils/note-resolution';
import type { ResolveEntityById } from '../utils/reference-resolution';
import { output, readOutputOptions } from './common';

type NoteRecord = Record<string, unknown>;

type NoteListOptions = {
  personId?: string;
  organizationId?: string;
  opportunityId?: string;
  all?: boolean;
  pageSize?: number;
  pageToken?: string;
  detailed?: boolean;
  full?: boolean;
};

const toId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

const toStringIdList = (value: unknown): string => {
  if (!Array.isArray(value)) return '';
  return value
    .map((entry) => toId(entry))
    .filter((id): id is string => typeof id === 'string')
    .join(', ');
};

const toNameList = (value: unknown): string => {
  if (!Array.isArray(value)) return '';
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return toId(entry) ?? '';
      }
      const typed = entry as Record<string, unknown>;
      if (typeof typed.name === 'string') return typed.name;
      return toId(typed.id) ?? '';
    })
    .filter((entry) => entry.length > 0)
    .join(', ');
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const tabularizeNotes = (notes: NoteRecord[]): NoteRecord[] =>
  notes.map((note) => {
    const interaction =
      note.interaction && typeof note.interaction === 'object' && !Array.isArray(note.interaction)
        ? (note.interaction as Record<string, unknown>)
        : undefined;
    const parentNote =
      note.parent_note && typeof note.parent_note === 'object' && !Array.isArray(note.parent_note)
        ? (note.parent_note as Record<string, unknown>)
        : undefined;

    return {
      id: toId(note.id) ?? null,
      type: toNumberOrNull(note.type),
      is_meeting: typeof note.is_meeting === 'boolean' ? note.is_meeting : null,
      interaction_id: toId(note.interaction_id) ?? null,
      interaction_type:
        toNumberOrNull(interaction?.type) ??
        (typeof note.interaction_type === 'number' || typeof note.interaction_type === 'string'
          ? note.interaction_type
          : null),
      interaction_date: typeof interaction?.date === 'string' ? interaction.date : null,
      parent_id: toId(note.parent_id) ?? null,
      parent_note_excerpt: parentNote ? truncateText(parentNote.content, 60) : '',
      person_ids: toStringIdList(note.person_ids),
      person_names: toNameList(note.persons),
      associated_person_ids: toStringIdList(note.associated_person_ids),
      associated_person_names: toNameList(note.associated_persons),
      interaction_person_ids: toStringIdList(note.interaction_person_ids),
      interaction_person_names: toNameList(note.interaction_persons),
      mentioned_person_ids: toStringIdList(note.mentioned_person_ids),
      mentioned_person_names: toNameList(note.mentioned_persons),
      organization_ids: toStringIdList(note.organization_ids),
      organization_names: toNameList(note.organizations),
      opportunity_ids: toStringIdList(note.opportunity_ids),
      opportunity_names: toNameList(note.opportunities),
      content: truncateText(note.content, 300),
      created_at: typeof note.created_at === 'string' ? note.created_at : null,
      updated_at: typeof note.updated_at === 'string' ? note.updated_at : null
    };
  });

const modeFromFlags = (
  options: { detailed?: boolean; full?: boolean },
  compact: boolean
): NoteDetailMode => {
  if (compact) return 'raw';
  if (options.full) return 'full';
  if (options.detailed) return 'detailed';
  return 'raw';
};

const buildListParams = (options: NoteListOptions): NoteListParams => ({
  personId: options.personId,
  organizationId: options.organizationId,
  opportunityId: options.opportunityId,
  pageSize: options.pageSize,
  pageToken: options.pageToken
});

const buildNotesPagination = (input: {
  mode: 'page' | 'all';
  pageSize: number;
  requestedPageToken?: string;
  nextPageToken?: string | null;
  pagesFetched: number;
  returnedCount: number;
  personId?: string;
  organizationId?: string;
  opportunityId?: string;
}): Record<string, unknown> => ({
  mode: input.mode,
  page_size: input.pageSize,
  requested_page_token: input.requestedPageToken ?? null,
  next_page_token: input.nextPageToken ?? null,
  has_more: Boolean(input.nextPageToken),
  pages_fetched: input.pagesFetched,
  returned_count: input.returnedCount,
  filters: {
    ...(input.personId ? { person_id: input.personId } : {}),
    ...(input.organizationId ? { organization_id: input.organizationId } : {}),
    ...(input.opportunityId ? { opportunity_id: input.opportunityId } : {})
  }
});

const buildResolutionDependencies = (
  notes: NotesEndpoint,
  options: { compact: boolean; mode: NoteDetailMode },
  resolvePersonById?: ResolveEntityById,
  resolveOrganizationById?: ResolveEntityById,
  resolveOpportunityById?: ResolveEntityById,
  resolveInteractionById?: ResolveEntityById
): NoteResolutionDependencies => {
  if (options.compact || options.mode === 'raw') return {};

  return {
    resolvePersonById,
    resolveOrganizationById,
    resolveOpportunityById,
    ...(options.mode === 'full'
      ? {
          resolveInteractionById,
          resolveNoteById: async (id: string) => notes.get(id)
        }
      : {})
  };
};

export const registerNoteCommands = (
  program: Command,
  notes: NotesEndpoint,
  resolvePersonById?: ResolveEntityById,
  resolveOrganizationById?: ResolveEntityById,
  resolveOpportunityById?: ResolveEntityById,
  resolveInteractionById?: ResolveEntityById
): void => {
  const cmd = program.command('note').description('Note commands');

  cmd
    .command('list')
    .option('--person-id <id>', 'Filter notes tagged with this person ID')
    .option('--organization-id <id>', 'Filter notes tagged with this organization ID')
    .option('--opportunity-id <id>', 'Filter notes tagged with this opportunity ID')
    .option('--all', 'Auto-paginate all records')
    .option('--page-size <n>', 'Page size', (value) => Number.parseInt(value, 10), 25)
    .option('--page-token <token>', 'Starting page token')
    .option(
      '--detailed',
      'Resolve linked entity references (persons, organizations, opportunities)'
    )
    .option('--full', 'Includes --detailed plus attached interaction and parent note summaries')
    .action(async function onAction(options: NoteListOptions) {
      const outputOptions = readOutputOptions(this);
      const mode = modeFromFlags(options, outputOptions.compact ?? false);
      const pageSize = options.pageSize ?? 25;
      const baseParams = buildListParams({ ...options, pageSize });
      const dependencies = buildResolutionDependencies(
        notes,
        { compact: outputOptions.compact, mode },
        resolvePersonById,
        resolveOrganizationById,
        resolveOpportunityById,
        resolveInteractionById
      );

      if (options.all) {
        let pageToken: string | undefined = options.pageToken;
        let pagesFetched = 0;
        const records: NoteRecord[] = [];

        while (true) {
          const page = await notes.list({ ...baseParams, pageToken });
          pagesFetched += 1;
          records.push(...(page.items as NoteRecord[]));
          if (!page.nextPageToken) break;
          pageToken = page.nextPageToken;
        }

        const resolved = await resolveNotesByMode(records, mode, dependencies);
        const withPreviewContent = withTruncatedNoteContent(resolved, 300);
        if (outputOptions.format === 'json') {
          output(this, {
            pagination: buildNotesPagination({
              mode: 'all',
              pageSize,
              requestedPageToken: options.pageToken,
              pagesFetched,
              returnedCount: resolved.length,
              personId: options.personId,
              organizationId: options.organizationId,
              opportunityId: options.opportunityId
            }),
            data: withPreviewContent
          });
          return;
        }

        output(this, tabularizeNotes(withPreviewContent));
        return;
      }

      const page = await notes.list(baseParams);
      const records = page.items as NoteRecord[];
      const resolved = await resolveNotesByMode(records, mode, dependencies);
      const withPreviewContent = withTruncatedNoteContent(resolved, 300);

      if (outputOptions.format === 'json') {
        output(this, {
          pagination: buildNotesPagination({
            mode: 'page',
            pageSize,
            requestedPageToken: options.pageToken,
            nextPageToken: page.nextPageToken,
            pagesFetched: 1,
            returnedCount: resolved.length,
            personId: options.personId,
            organizationId: options.organizationId,
            opportunityId: options.opportunityId
          }),
          data: withPreviewContent
        });
        return;
      }

      output(this, tabularizeNotes(withPreviewContent));
    });

  cmd
    .command('get')
    .argument('<id>', 'Note ID')
    .option('--detailed', 'Resolve linked entity references')
    .option('--full', 'Includes --detailed plus interaction and parent note summaries')
    .action(async function onAction(
      id: string,
      options: {
        detailed?: boolean;
        full?: boolean;
      }
    ) {
      const outputOptions = readOutputOptions(this);
      const mode = modeFromFlags(options, outputOptions.compact ?? false);
      const dependencies = buildResolutionDependencies(
        notes,
        { compact: outputOptions.compact, mode },
        resolvePersonById,
        resolveOrganizationById,
        resolveOpportunityById,
        resolveInteractionById
      );

      const record = (await notes.get(id)) as NoteRecord;
      output(this, await resolveNoteByMode(record, mode, dependencies));
    });

  cmd
    .command('create')
    .requiredOption('--data <json>', 'Note payload JSON')
    .action(async function onAction(options: { data: string }) {
      output(this, await notes.create(parseJsonArg(options.data, '--data')));
    });

  cmd
    .command('update')
    .argument('<id>', 'Note ID')
    .requiredOption('--data <json>', 'Note payload JSON')
    .action(async function onAction(id: string, options: { data: string }) {
      output(this, await notes.update(id, parseJsonArg(options.data, '--data')));
    });

  cmd
    .command('delete')
    .argument('<id>', 'Note ID')
    .action(async function onAction(id: string) {
      output(this, await notes.delete(id));
    });
};
