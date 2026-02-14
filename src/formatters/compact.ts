const hiddenKeys = new Set(['created_at', 'updated_at', 'creator_id', 'modifier_id']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isScalarRefObject = (obj: Record<string, unknown>, labelKey: 'title' | 'name'): boolean => {
  const allowed = new Set(['id', labelKey]);
  return Object.keys(obj).every((key) => allowed.has(key));
};

const formatLocation = (value: Record<string, unknown>): string => {
  const parts = [value.city, value.state, value.country].filter(
    (part): part is string => typeof part === 'string' && part.length > 0
  );
  return parts.join(', ');
};

const hasUsefulPersonIds = (interaction: Record<string, unknown>): boolean =>
  Array.isArray(interaction.person_ids) && interaction.person_ids.length > 0;

const hasUsefulResolvedPersons = (interaction: Record<string, unknown>): boolean =>
  Array.isArray(interaction.persons) && interaction.persons.length > 0;

const isRedundantInteractions = (
  interactionDates: Record<string, unknown>,
  interactions: Record<string, unknown>
): boolean => {
  const entries = Object.entries(interactions);
  if (entries.length === 0) return false;

  for (const [interactionType, value] of entries) {
    if (!isRecord(value) || typeof value.date !== 'string') return false;
    if (hasUsefulPersonIds(value) || hasUsefulResolvedPersons(value)) return false;

    const expectedDate = interactionDates[`${interactionType}_date`];
    if (expectedDate !== value.date) return false;
  }

  return true;
};

const flattenValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((entry) => flattenValue(entry));
  if (!value || typeof value !== 'object') return value;

  const obj = value as Record<string, unknown>;
  if (typeof obj.title === 'string' && isScalarRefObject(obj, 'title')) return obj.title;
  if (typeof obj.name === 'string' && isScalarRefObject(obj, 'name')) return obj.name;
  if ('city' in obj || 'state' in obj || 'country' in obj) return formatLocation(obj);

  const shouldDropInteractions =
    isRecord(obj.interaction_dates) &&
    isRecord(obj.interactions) &&
    isRedundantInteractions(obj.interaction_dates, obj.interactions);

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (shouldDropInteractions && k === 'interactions') continue;
    if (hiddenKeys.has(k) || k.startsWith('test_')) continue;
    result[k] = flattenValue(v);
  }
  return result;
};

export const compactData = <T>(input: T): T => flattenValue(input) as T;
