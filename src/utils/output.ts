import { compactData } from '../formatters/compact';
import { formatCsv } from '../formatters/csv';
import { formatJson } from '../formatters/json';
import { formatTable } from '../formatters/table';

type OutputFormat = 'json' | 'table' | 'csv';

export type OutputOptions = {
  format: OutputFormat;
  compact: boolean;
  verbose: boolean;
};

export const emitOutput = (data: unknown, options: OutputOptions): void => {
  const payload = options.verbose || !options.compact ? data : compactData(data);

  switch (options.format) {
    case 'csv':
      console.log(formatCsv(payload));
      return;
    case 'table':
      console.log(formatTable(payload));
      return;
    case 'json':
    default:
      console.log(formatJson(payload));
  }
};
