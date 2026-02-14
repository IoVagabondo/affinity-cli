export type PageResult<T> = {
  items: T[];
  nextPageToken?: string | null;
};

export const collectAllPages = async <T>(
  fetchPage: (pageToken?: string) => Promise<PageResult<T>>
): Promise<T[]> => {
  const all: T[] = [];
  let token: string | undefined;

  do {
    const page = await fetchPage(token);
    all.push(...page.items);
    token = page.nextPageToken ?? undefined;
  } while (token);

  return all;
};

export const pickRecords = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.records)) return obj.records as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.persons)) return obj.persons as T[];
    if (Array.isArray(obj.organizations)) return obj.organizations as T[];
    if (Array.isArray(obj.opportunities)) return obj.opportunities as T[];
    if (Array.isArray(obj.list_entries)) return obj.list_entries as T[];
    if (Array.isArray(obj.field_values)) return obj.field_values as T[];
    if (Array.isArray(obj.fields)) return obj.fields as T[];
    if (Array.isArray(obj.lists)) return obj.lists as T[];
    if (Array.isArray(obj.notes)) return obj.notes as T[];
    const firstArray = Object.values(obj).find((value) => Array.isArray(value));
    if (Array.isArray(firstArray)) return firstArray as T[];
  }
  return [];
};
