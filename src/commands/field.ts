import type { Command } from 'commander';
import type { FieldsEndpoint } from '../api/endpoints/fields';
import { collectAllPages } from '../utils/pagination';
import { parseJsonArg } from '../utils/parse-json';
import { output } from './common';

export const registerFieldCommands = (program: Command, fields: FieldsEndpoint): void => {
  const cmd = program.command('field').description('Field commands');

  cmd
    .command('list')
    .option('--entity-type <type>', 'Entity type filter')
    .option('--list-id <id>', 'List ID filter')
    .option('--all', 'Auto-paginate')
    .action(async function onAction(options: {
      entityType?: string;
      listId?: string;
      all?: boolean;
    }) {
      const fetch = (pageToken?: string) =>
        fields.list({ entityType: options.entityType, listId: options.listId, pageToken });
      const records = options.all
        ? await collectAllPages((token) => fetch(token))
        : (await fetch()).items;
      output(this, records);
    });

  cmd
    .command('create')
    .requiredOption('--data <json>', 'Raw field payload JSON')
    .action(async function onAction(options: { data: string }) {
      const data = parseJsonArg<Record<string, unknown>>(options.data, '--data');
      output(this, await fields.create(data));
    });

  cmd
    .command('delete')
    .argument('<id>', 'Field ID')
    .action(async function onAction(id: string) {
      output(this, await fields.delete(id));
    });
};
