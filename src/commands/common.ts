import type { Command } from 'commander';
import { emitOutput, type OutputOptions } from '../utils/output';

export type GlobalOpts = {
  format?: 'json' | 'table' | 'csv';
  compact?: boolean;
  verbose?: boolean;
};

export const readOutputOptions = (command: Command): OutputOptions => {
  const root = command.optsWithGlobals<GlobalOpts>();
  return {
    format: root.format ?? 'json',
    compact: root.compact ?? false,
    verbose: root.verbose ?? false
  };
};

export const output = (command: Command, data: unknown): void => {
  emitOutput(data, readOutputOptions(command));
};
