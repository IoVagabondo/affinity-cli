import { stringify } from 'csv-stringify/sync';

export const formatCsv = (data: unknown): string => {
  const rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return '';

  return stringify(rows as object[], {
    header: true
  });
};
