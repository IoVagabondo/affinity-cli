import type { Command } from 'commander';
import type { FieldValuesEndpoint } from '../api/endpoints/fieldValues';
import { collectAllPages } from '../utils/pagination';
import { parseJsonArg } from '../utils/parse-json';
import { output } from './common';

export const registerFieldValueCommands = (
  program: Command,
  fieldValues: FieldValuesEndpoint
): void => {
  const cmd = program.command('field-value').description('Field value commands');

  cmd
    .command('list')
    .option('--person-id <id>', 'Person ID')
    .option('--org-id <id>', 'Organization ID')
    .option('--opp-id <id>', 'Opportunity ID')
    .option('--entry-id <id>', 'List entry ID')
    .option('--all', 'Auto-paginate')
    .action(async function onAction(options: {
      personId?: string;
      orgId?: string;
      oppId?: string;
      entryId?: string;
      all?: boolean;
    }) {
      const provided = [options.personId, options.orgId, options.oppId, options.entryId].filter(
        Boolean
      );
      if (provided.length !== 1) {
        throw new Error('Exactly one of --person-id|--org-id|--opp-id|--entry-id is required');
      }

      const fetch = (pageToken?: string) =>
        fieldValues.list({
          personId: options.personId,
          orgId: options.orgId,
          oppId: options.oppId,
          entryId: options.entryId,
          pageToken
        });

      const records = options.all
        ? await collectAllPages((token) => fetch(token))
        : (await fetch()).items;
      output(this, records);
    });

  cmd
    .command('update')
    .argument('<id>', 'Field value ID')
    .requiredOption('--value <json>', 'JSON value payload')
    .action(async function onAction(id: string, options: { value: string }) {
      const value = parseJsonArg<unknown>(options.value, '--value');
      output(this, await fieldValues.update(id, value));
    });
};
