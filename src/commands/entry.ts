import type { Command } from 'commander';
import type { EntriesEndpoint } from '../api/endpoints/entries';
import { collectAllPages } from '../utils/pagination';
import { output } from './common';

export const registerEntryCommands = (program: Command, entries: EntriesEndpoint): void => {
  const cmd = program.command('entry').description('List entry commands');

  cmd
    .command('list')
    .argument('<list-id>', 'List ID')
    .option('--all', 'Auto-paginate')
    .option('--page-size <n>', 'Page size', (value) => Number.parseInt(value, 10))
    .option('--page-token <token>', 'Starting page token')
    .action(async function onAction(
      listId: string,
      options: { all?: boolean; pageSize?: number; pageToken?: string }
    ) {
      const firstToken = options.pageToken;
      const records = options.all
        ? await collectAllPages((pageToken) =>
            entries.list(listId, pageToken ?? firstToken, options.pageSize)
          )
        : (await entries.list(listId, options.pageToken, options.pageSize)).items;
      output(this, records);
    });

  cmd
    .command('get')
    .argument('<list-id>', 'List ID')
    .argument('<entry-id>', 'Entry ID')
    .action(async function onAction(listId: string, entryId: string) {
      output(this, await entries.get(listId, entryId));
    });

  cmd
    .command('add')
    .argument('<list-id>', 'List ID')
    .requiredOption('--entity-id <id>', 'Entity ID')
    .action(async function onAction(listId: string, options: { entityId: string }) {
      output(this, await entries.add(listId, options.entityId));
    });

  cmd
    .command('delete')
    .argument('<list-id>', 'List ID')
    .argument('<entry-id>', 'Entry ID')
    .action(async function onAction(listId: string, entryId: string) {
      output(this, await entries.delete(listId, entryId));
    });
};
