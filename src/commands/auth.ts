import type { Command } from 'commander';
import type { AuthEndpoint } from '../api/endpoints/auth';
import { output } from './common';

export const registerAuthCommands = (program: Command, auth: AuthEndpoint): void => {
  const cmd = program.command('auth').description('Authentication and account commands');

  cmd
    .command('whoami')
    .description('Get current authenticated user')
    .action(async function onAction() {
      output(this, await auth.whoami());
    });

  cmd
    .command('rate-limit')
    .description('Get API rate limit details')
    .action(async function onAction() {
      output(this, await auth.rateLimit());
    });
};
