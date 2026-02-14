import { summarizePersonReference } from './reference-resolution';

type RecordValue = Record<string, unknown>;
export type ResolvePersonById = (id: string) => Promise<RecordValue>;
type BuildSummary = (payload: RecordValue, fallbackId: string) => RecordValue;

const isRecord = (value: unknown): value is RecordValue =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

const pickPersonIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const ids = value
    .map((entry) => toId(entry))
    .filter((entry): entry is string => typeof entry === 'string');
  return Array.from(new Set(ids));
};

const collectInteractionPersonIds = (records: RecordValue[]): string[] => {
  const ids = new Set<string>();

  for (const record of records) {
    if (!isRecord(record.interactions)) continue;
    for (const interaction of Object.values(record.interactions)) {
      if (!isRecord(interaction)) continue;
      for (const id of pickPersonIds(interaction.person_ids)) {
        ids.add(id);
      }
    }
  }

  return Array.from(ids);
};

const resolvePersonsById = async (
  ids: string[],
  resolvePersonById: ResolvePersonById,
  buildSummary: BuildSummary
): Promise<Map<string, RecordValue>> => {
  const resolved = new Map<string, RecordValue>();
  const batchSize = 10;

  for (let index = 0; index < ids.length; index += batchSize) {
    const batch = ids.slice(index, index + batchSize);
    await Promise.all(
      batch.map(async (id) => {
        try {
          const person = await resolvePersonById(id);
          resolved.set(id, buildSummary(person, id));
        } catch {
          resolved.set(id, { id });
        }
      })
    );
  }

  return resolved;
};

export const resolvePersonIds = async (
  idsValue: unknown,
  resolvePersonById: ResolvePersonById,
  buildSummary: BuildSummary = summarizePersonReference
): Promise<RecordValue[]> => {
  const ids = pickPersonIds(idsValue);
  if (ids.length === 0) return [];

  const resolvedById = await resolvePersonsById(ids, resolvePersonById, buildSummary);
  return ids.map((id) => resolvedById.get(id) ?? { id });
};

export const resolveInteractionPersons = async <T extends RecordValue>(
  records: T[],
  resolvePersonById: ResolvePersonById,
  buildSummary: BuildSummary = summarizePersonReference
): Promise<T[]> => {
  const ids = collectInteractionPersonIds(records);
  const resolvedById =
    ids.length > 0
      ? await resolvePersonsById(ids, resolvePersonById, buildSummary)
      : new Map<string, RecordValue>();

  return records.map((record) => {
    if (!isRecord(record.interactions)) return record;

    const nextInteractions: RecordValue = {};
    let changed = false;

    for (const [interactionType, interactionValue] of Object.entries(record.interactions)) {
      if (!isRecord(interactionValue)) {
        nextInteractions[interactionType] = interactionValue;
        continue;
      }

      if (!Array.isArray(interactionValue.person_ids)) {
        nextInteractions[interactionType] = interactionValue;
        continue;
      }

      const personIds = pickPersonIds(interactionValue.person_ids);
      const persons = personIds.map((id) => resolvedById.get(id) ?? { id });
      const { person_ids: _removedPersonIds, ...rest } = interactionValue;
      nextInteractions[interactionType] = {
        ...rest,
        persons
      };
      changed = true;
    }

    if (!changed) return record;
    return {
      ...record,
      interactions: nextInteractions
    };
  });
};
