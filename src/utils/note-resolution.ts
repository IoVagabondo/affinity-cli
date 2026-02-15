import {
  resolveRecordsForeignKeyField,
  resolveRecordsIdField,
  summarizeOpportunityReference,
  summarizeOrganizationReference,
  summarizePersonReference,
  type ResolveEntityById
} from './reference-resolution';

type NoteRecord = Record<string, unknown>;

export type NoteDetailMode = 'raw' | 'detailed' | 'full';

export type NoteResolutionDependencies = {
  resolvePersonById?: ResolveEntityById;
  resolveOrganizationById?: ResolveEntityById;
  resolveOpportunityById?: ResolveEntityById;
  resolveInteractionById?: ResolveEntityById;
  resolveNoteById?: ResolveEntityById;
};

const toId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

const memoizeResolver = (resolveById?: ResolveEntityById): ResolveEntityById | undefined => {
  if (!resolveById) return undefined;

  const cache = new Map<string, Promise<Record<string, unknown>>>();
  return async (id: string) => {
    const cached = cache.get(id);
    if (cached) return cached;
    const pending = resolveById(id);
    cache.set(id, pending);
    return pending;
  };
};

const summarizeInteractionReference = (
  payload: Record<string, unknown>,
  fallbackId: string
): Record<string, unknown> => {
  const id = toId(payload.id) ?? fallbackId;
  const type =
    typeof payload.type === 'number' || typeof payload.type === 'string' ? payload.type : undefined;
  const date = typeof payload.date === 'string' ? payload.date : undefined;
  const createdAt = typeof payload.created_at === 'string' ? payload.created_at : undefined;

  return {
    ...payload,
    id,
    ...(type !== undefined ? { type } : {}),
    ...(date ? { date } : {}),
    ...(createdAt ? { created_at: createdAt } : {})
  };
};

const summarizeParentNoteReference = (
  payload: Record<string, unknown>,
  fallbackId: string
): Record<string, unknown> => {
  const id = toId(payload.id) ?? fallbackId;
  const content = typeof payload.content === 'string' ? payload.content : undefined;
  const type =
    typeof payload.type === 'number' || typeof payload.type === 'string' ? payload.type : undefined;
  const createdAt = typeof payload.created_at === 'string' ? payload.created_at : undefined;
  const updatedAt = typeof payload.updated_at === 'string' ? payload.updated_at : undefined;

  return {
    id,
    ...(content ? { content } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(createdAt ? { created_at: createdAt } : {}),
    ...(updatedAt ? { updated_at: updatedAt } : {})
  };
};

export const resolveNotesDetailed = async (
  notes: NoteRecord[],
  dependencies: NoteResolutionDependencies
): Promise<NoteRecord[]> => {
  let resolved: NoteRecord[] = notes;

  const resolvePersonById = memoizeResolver(dependencies.resolvePersonById);
  const resolveOrganizationById = memoizeResolver(dependencies.resolveOrganizationById);
  const resolveOpportunityById = memoizeResolver(dependencies.resolveOpportunityById);

  if (resolvePersonById) {
    const personFieldMappings: Array<{ idsField: string; targetField: string }> = [
      { idsField: 'person_ids', targetField: 'persons' },
      { idsField: 'associated_person_ids', targetField: 'associated_persons' },
      { idsField: 'interaction_person_ids', targetField: 'interaction_persons' },
      { idsField: 'mentioned_person_ids', targetField: 'mentioned_persons' }
    ];

    for (const mapping of personFieldMappings) {
      resolved = await resolveRecordsIdField(resolved, {
        idsField: mapping.idsField,
        targetField: mapping.targetField,
        resolveById: resolvePersonById,
        buildSummary: summarizePersonReference,
        dropSourceField: false
      });
    }
  }

  if (resolveOrganizationById) {
    resolved = await resolveRecordsIdField(resolved, {
      idsField: 'organization_ids',
      targetField: 'organizations',
      resolveById: resolveOrganizationById,
      buildSummary: summarizeOrganizationReference,
      dropSourceField: false
    });
  }

  if (resolveOpportunityById) {
    resolved = await resolveRecordsIdField(resolved, {
      idsField: 'opportunity_ids',
      targetField: 'opportunities',
      resolveById: resolveOpportunityById,
      buildSummary: summarizeOpportunityReference,
      dropSourceField: false
    });
  }

  return resolved;
};

export const resolveNotesFull = async (
  notes: NoteRecord[],
  dependencies: NoteResolutionDependencies
): Promise<NoteRecord[]> => {
  let resolved = await resolveNotesDetailed(notes, dependencies);

  const resolveInteractionById = memoizeResolver(dependencies.resolveInteractionById);
  if (resolveInteractionById) {
    resolved = await resolveRecordsForeignKeyField(resolved, {
      idField: 'interaction_id',
      targetField: 'interaction',
      resolveById: resolveInteractionById,
      buildSummary: summarizeInteractionReference,
      dropSourceField: false
    });
  }

  const resolveNoteById = memoizeResolver(dependencies.resolveNoteById);
  if (resolveNoteById) {
    resolved = await resolveRecordsForeignKeyField(resolved, {
      idField: 'parent_id',
      targetField: 'parent_note',
      resolveById: resolveNoteById,
      buildSummary: summarizeParentNoteReference,
      dropSourceField: false
    });
  }

  return resolved;
};

export const resolveNotesByMode = async (
  notes: NoteRecord[],
  mode: NoteDetailMode,
  dependencies: NoteResolutionDependencies
): Promise<NoteRecord[]> => {
  if (mode === 'raw') return notes;
  if (mode === 'detailed') return resolveNotesDetailed(notes, dependencies);
  return resolveNotesFull(notes, dependencies);
};

export const resolveNoteByMode = async (
  note: NoteRecord,
  mode: NoteDetailMode,
  dependencies: NoteResolutionDependencies
): Promise<NoteRecord> => {
  const [resolved] = await resolveNotesByMode([note], mode, dependencies);
  return resolved ?? note;
};
