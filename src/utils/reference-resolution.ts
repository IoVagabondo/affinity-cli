type RecordValue = Record<string, unknown>;

export type ResolveEntityById = (id: string) => Promise<RecordValue>;
type BuildSummary = (payload: RecordValue, fallbackId: string) => RecordValue;

const toId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

const pickUniqueIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    const id = toId(entry);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
};

const resolveByIds = async (
  ids: string[],
  resolveById: ResolveEntityById,
  buildSummary: BuildSummary
): Promise<Map<string, RecordValue>> => {
  const out = new Map<string, RecordValue>();
  const batchSize = 10;

  for (let index = 0; index < ids.length; index += batchSize) {
    const batch = ids.slice(index, index + batchSize);
    await Promise.all(
      batch.map(async (id) => {
        try {
          const payload = await resolveById(id);
          out.set(id, buildSummary(payload, id));
        } catch {
          out.set(id, { id });
        }
      })
    );
  }
  return out;
};

export const summarizePersonReference = (payload: RecordValue, fallbackId: string): RecordValue => {
  const id = toId(payload.id) ?? fallbackId;
  const firstName = typeof payload.first_name === 'string' ? payload.first_name : undefined;
  const lastName = typeof payload.last_name === 'string' ? payload.last_name : undefined;
  const primaryEmailFromField =
    typeof payload.primary_email === 'string' ? payload.primary_email : undefined;
  const emails = Array.isArray(payload.emails)
    ? payload.emails.filter((entry): entry is string => typeof entry === 'string')
    : [];
  const primaryEmail = primaryEmailFromField ?? emails[0];
  const explicitName = typeof payload.name === 'string' ? payload.name : undefined;
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const name = explicitName ?? (fullName.length > 0 ? fullName : undefined) ?? primaryEmail ?? id;

  return {
    id,
    name,
    ...(firstName ? { first_name: firstName } : {}),
    ...(lastName ? { last_name: lastName } : {}),
    ...(primaryEmail ? { primary_email: primaryEmail } : {}),
    ...(emails.length > 0 ? { emails } : {})
  };
};

export const summarizeInteractionPersonReference = (
  payload: RecordValue,
  fallbackId: string
): RecordValue => {
  const full = summarizePersonReference(payload, fallbackId);
  const id = toId(full.id) ?? fallbackId;
  const name = typeof full.name === 'string' ? full.name : id;
  const primaryEmail = typeof full.primary_email === 'string' ? full.primary_email : undefined;

  return {
    id,
    name,
    ...(primaryEmail ? { primary_email: primaryEmail } : {})
  };
};

export const summarizeOrganizationReference = (
  payload: RecordValue,
  fallbackId: string
): RecordValue => {
  const id = toId(payload.id) ?? fallbackId;
  const name = typeof payload.name === 'string' ? payload.name : undefined;
  const domain = typeof payload.domain === 'string' ? payload.domain : undefined;
  const domains = Array.isArray(payload.domains)
    ? payload.domains.filter((entry): entry is string => typeof entry === 'string')
    : undefined;

  return {
    id,
    ...(name ? { name } : {}),
    ...(domain ? { domain } : {}),
    ...(domains && domains.length > 0 ? { domains } : {})
  };
};

export const summarizeOpportunityReference = (
  payload: RecordValue,
  fallbackId: string
): RecordValue => {
  const id = toId(payload.id) ?? fallbackId;
  const name = typeof payload.name === 'string' ? payload.name : undefined;
  const personIds = pickUniqueIds(payload.person_ids);
  const organizationIds = pickUniqueIds(payload.organization_ids);

  return {
    id,
    ...(name ? { name } : {}),
    ...(personIds.length > 0 ? { person_ids: personIds } : {}),
    ...(organizationIds.length > 0 ? { organization_ids: organizationIds } : {})
  };
};

export const summarizeOpportunityResolvedReference = (
  payload: RecordValue,
  fallbackId: string
): RecordValue => {
  const id = toId(payload.id) ?? fallbackId;
  const personIds = pickUniqueIds(payload.person_ids);
  const organizationIds = pickUniqueIds(payload.organization_ids);

  return {
    ...payload,
    id,
    ...(personIds.length > 0 ? { person_ids: personIds } : {}),
    ...(organizationIds.length > 0 ? { organization_ids: organizationIds } : {})
  };
};

export const summarizeListReference = (payload: RecordValue, fallbackId: string): RecordValue => {
  const id = toId(payload.id) ?? fallbackId;
  const name = typeof payload.name === 'string' ? payload.name : undefined;
  const entityType =
    typeof payload.entity_type === 'string' || typeof payload.entity_type === 'number'
      ? payload.entity_type
      : undefined;
  const listSize = typeof payload.list_size === 'number' ? payload.list_size : undefined;
  const isPrivate = typeof payload.is_private === 'boolean' ? payload.is_private : undefined;

  return {
    id,
    ...(name ? { name } : {}),
    ...(entityType !== undefined ? { entity_type: entityType } : {}),
    ...(listSize !== undefined ? { list_size: listSize } : {}),
    ...(isPrivate !== undefined ? { is_private: isPrivate } : {})
  };
};

export const resolveIdList = async (
  idsValue: unknown,
  resolveById: ResolveEntityById,
  buildSummary: BuildSummary
): Promise<RecordValue[]> => {
  const ids = pickUniqueIds(idsValue);
  if (ids.length === 0) return [];

  const resolvedById = await resolveByIds(ids, resolveById, buildSummary);
  return ids.map((id) => resolvedById.get(id) ?? { id });
};

export const resolveRecordIdField = async (
  record: RecordValue,
  options: {
    idsField: string;
    targetField: string;
    resolveById: ResolveEntityById;
    buildSummary: BuildSummary;
    dropSourceField?: boolean;
  }
): Promise<RecordValue> => {
  const idsValue = record[options.idsField];
  if (!Array.isArray(idsValue)) return record;

  const resolved = await resolveIdList(idsValue, options.resolveById, options.buildSummary);
  if (resolved.length === 0 && !options.dropSourceField) {
    return {
      ...record,
      [options.targetField]: resolved
    };
  }

  if (options.dropSourceField === false) {
    return {
      ...record,
      [options.targetField]: resolved
    };
  }

  const { [options.idsField]: _removedIds, ...rest } = record;
  return {
    ...rest,
    [options.targetField]: resolved
  };
};

export const resolveRecordsIdField = async (
  records: RecordValue[],
  options: {
    idsField: string;
    targetField: string;
    resolveById: ResolveEntityById;
    buildSummary: BuildSummary;
    dropSourceField?: boolean;
  }
): Promise<RecordValue[]> => {
  const ids = new Set<string>();
  for (const record of records) {
    const value = record[options.idsField];
    if (!Array.isArray(value)) continue;
    for (const id of pickUniqueIds(value)) ids.add(id);
  }
  if (ids.size === 0) return records;

  const resolvedById = await resolveByIds(
    Array.from(ids),
    options.resolveById,
    options.buildSummary
  );

  return records.map((record) => {
    const value = record[options.idsField];
    if (!Array.isArray(value)) return record;

    const resolved = pickUniqueIds(value).map((id) => resolvedById.get(id) ?? { id });
    if (options.dropSourceField === false) {
      return {
        ...record,
        [options.targetField]: resolved
      };
    }
    const { [options.idsField]: _removedIds, ...rest } = record;
    return {
      ...rest,
      [options.targetField]: resolved
    };
  });
};

export const resolveNestedArrayForeignKeyField = async (
  record: RecordValue,
  options: {
    arrayField: string;
    idField: string;
    targetField: string;
    resolveById: ResolveEntityById;
    buildSummary: BuildSummary;
    dropSourceField?: boolean;
  }
): Promise<RecordValue> => {
  const raw = record[options.arrayField];
  if (!Array.isArray(raw)) return record;
  const rawEntries: unknown[] = raw;

  const entryRecords = rawEntries.filter(
    (entry): entry is RecordValue =>
      Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
  );
  const ids = Array.from(
    new Set(
      entryRecords
        .map((entry) => toId(entry[options.idField]))
        .filter((id): id is string => typeof id === 'string')
    )
  );

  const resolvedById =
    ids.length > 0 ? await resolveByIds(ids, options.resolveById, options.buildSummary) : new Map();

  const resolvedEntries = rawEntries.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
    const typed = entry as RecordValue;
    const id = toId(typed[options.idField]);
    if (!id) return typed;

    const target = resolvedById.get(id) ?? { id };
    if (options.dropSourceField === false) {
      return {
        ...typed,
        [options.targetField]: target
      };
    }
    const { [options.idField]: _removedId, ...rest } = typed;
    return {
      ...rest,
      [options.targetField]: target
    };
  });

  return {
    ...record,
    [options.arrayField]: resolvedEntries
  };
};
