import Table from 'cli-table3';

export const formatTable = (data: unknown): string => {
  const rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return '';

  const first = rows[0];
  if (!first || typeof first !== 'object' || Array.isArray(first)) {
    return rows.map((row) => String(row)).join('\n');
  }

  const headers = Object.keys(first as Record<string, unknown>);
  const table = new Table({ head: headers });
  for (const row of rows) {
    const obj = row as Record<string, unknown>;
    table.push(headers.map((header) => stringifyCell(obj[header])));
  }
  return table.toString();
};

const stringifyCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};
