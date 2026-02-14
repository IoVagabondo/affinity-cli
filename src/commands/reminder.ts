import type { Command } from 'commander';
import type { RemindersEndpoint } from '../api/endpoints/reminders';
import { parseJsonArg } from '../utils/parse-json';
import { output } from './common';

export const registerReminderCommands = (program: Command, reminders: RemindersEndpoint): void => {
  const cmd = program.command('reminder').description('Reminder commands');

  cmd.command('list').action(async function onAction() {
    output(this, await reminders.list());
  });

  cmd
    .command('get')
    .argument('<id>', 'Reminder ID')
    .action(async function onAction(id: string) {
      output(this, await reminders.get(id));
    });

  cmd
    .command('create')
    .requiredOption('--data <json>', 'Reminder payload JSON')
    .action(async function onAction(options: { data: string }) {
      output(this, await reminders.create(parseJsonArg(options.data, '--data')));
    });
};
