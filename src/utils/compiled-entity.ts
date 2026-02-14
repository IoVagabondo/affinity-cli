import type { AffinityEntity, Field, FieldValue } from '../api/types';

type ResolvePersonById = (id: string) => Promise<Record<string, unknown>>;

const toId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const formatLocation = (value: Record<string, unknown>): string => {
  const parts = [value.city, value.state, value.country].filter(
    (part): part is string => typeof part === 'string' && part.length > 0
  );
  return parts.join(', ');
};

const normalizeFieldValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((entry) => normalizeFieldValue(entry));
  if (!isRecord(value)) return value;

  if (typeof value.text === 'string') return value.text;
  if (typeof value.title === 'string') return value.title;
  if (typeof value.name === 'string') return value.name;
  if ('city' in value || 'state' in value || 'country' in value) return formatLocation(value);
  return value;
};

const appendCompiledValue = (
  target: Record<string, unknown>,
  key: string,
  value: unknown
): void => {
  const existing = target[key];
  if (existing === undefined) {
    target[key] = value;
    return;
  }

  if (Array.isArray(existing)) {
    existing.push(value);
    return;
  }

  target[key] = [existing, value];
};

const buildFieldNameById = (fields: Field[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const field of fields) {
    const id = toId(field.id);
    const name = typeof field.name === 'string' ? field.name : undefined;
    if (!id || !name) continue;
    map.set(id, name);
  }
  return map;
};

const buildFieldValueTypeById = (fields: Field[]): Map<string, string | number | undefined> => {
  const map = new Map<string, string | number | undefined>();
  for (const field of fields) {
    const id = toId(field.id);
    if (!id) continue;
    const valueType =
      typeof field.value_type === 'string' || typeof field.value_type === 'number'
        ? field.value_type
        : undefined;
    map.set(id, valueType);
  }
  return map;
};

const personNameFromPayload = (payload: Record<string, unknown>, fallbackId: string): string => {
  const firstName = typeof payload.first_name === 'string' ? payload.first_name : undefined;
  const lastName = typeof payload.last_name === 'string' ? payload.last_name : undefined;
  const explicitName = typeof payload.name === 'string' ? payload.name : undefined;
  const primaryEmail =
    typeof payload.primary_email === 'string' ? payload.primary_email : undefined;

  const fullName = [firstName, lastName]
    .filter((value): value is string => Boolean(value))
    .join(' ');
  return explicitName ?? (fullName.length > 0 ? fullName : undefined) ?? primaryEmail ?? fallbackId;
};

const resolvePersonValue = async (
  value: unknown,
  resolvePersonById: ResolvePersonById | undefined,
  cache: Map<string, string>
): Promise<unknown> => {
  if (Array.isArray(value)) {
    return Promise.all(value.map((entry) => resolvePersonValue(entry, resolvePersonById, cache)));
  }

  if (typeof value !== 'string' && typeof value !== 'number') return value;
  if (!resolvePersonById) return value;

  const id = String(value);
  const cached = cache.get(id);
  if (cached) return cached;

  try {
    const person = await resolvePersonById(id);
    const name = personNameFromPayload(person, id);
    cache.set(id, name);
    return name;
  } catch {
    cache.set(id, id);
    return id;
  }
};

export const compileEntity = async (
  entity: AffinityEntity,
  fieldValues: FieldValue[],
  fields: Field[] = [],
  resolvePersonById?: ResolvePersonById
): Promise<Record<string, unknown>> => {
  const fieldNameById = buildFieldNameById(fields);
  const fieldValueTypeById = buildFieldValueTypeById(fields);
  const personCache = new Map<string, string>();
  const compiledFields: Record<string, unknown> = {};

  for (const fieldValue of fieldValues) {
    if (fieldValue.value === null || fieldValue.value === undefined) {
      continue;
    }

    const fieldId = toId(fieldValue.field_id);
    const key =
      (fieldId ? fieldNameById.get(fieldId) : undefined) ??
      (fieldId ? `field_${fieldId}` : `field_value_${fieldValue.id}`);

    const normalized = normalizeFieldValue(fieldValue.value);
    const valueType = fieldId ? fieldValueTypeById.get(fieldId) : undefined;
    const value =
      valueType === 0 || valueType === '0'
        ? await resolvePersonValue(normalized, resolvePersonById, personCache)
        : normalized;
    appendCompiledValue(compiledFields, key, value);
  }

  return {
    ...entity,
    fields: compiledFields
  };
};
