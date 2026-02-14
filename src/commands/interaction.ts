import type { Command } from 'commander';
import type { InteractionsEndpoint } from '../api/endpoints/interactions';
import { parseJsonArg } from '../utils/parse-json';
import { output } from './common';

export const registerInteractionCommands = (
  program: Command,
  interactions: InteractionsEndpoint
): void => {
  const cmd = program.command('interaction').description('Interaction commands');

  cmd.command('list').action(async function onAction() {
    output(this, await interactions.list());
  });

  cmd
    .command('get')
    .argument('<id>', 'Interaction ID')
    .action(async function onAction(id: string) {
      output(this, await interactions.get(id));
    });

  cmd
    .command('create')
    .requiredOption('--data <json>', 'Interaction payload JSON')
    .action(async function onAction(options: { data: string }) {
      output(this, await interactions.create(parseJsonArg(options.data, '--data')));
    });
};
