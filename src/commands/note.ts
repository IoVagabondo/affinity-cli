import type { Command } from 'commander';
import type { NotesEndpoint } from '../api/endpoints/notes';
import { parseJsonArg } from '../utils/parse-json';
import { output } from './common';

export const registerNoteCommands = (program: Command, notes: NotesEndpoint): void => {
  const cmd = program.command('note').description('Note commands');

  cmd.command('list').action(async function onAction() {
    output(this, await notes.list({}));
  });

  cmd
    .command('get')
    .argument('<id>', 'Note ID')
    .action(async function onAction(id: string) {
      output(this, await notes.get(id));
    });

  cmd
    .command('create')
    .requiredOption('--data <json>', 'Note payload JSON')
    .action(async function onAction(options: { data: string }) {
      output(this, await notes.create(parseJsonArg(options.data, '--data')));
    });
};
