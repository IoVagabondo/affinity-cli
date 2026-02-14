import type { Command } from 'commander';
import type { OpportunitiesEndpoint } from '../api/endpoints/opportunities';
import { registerEntityCommands } from './entity';

export const registerOpportunityCommands = (
  program: Command,
  endpoint: OpportunitiesEndpoint,
  resolvePersonById?: (id: string) => Promise<Record<string, unknown>>
): void => {
  registerEntityCommands(program, 'opportunity', endpoint, resolvePersonById);
};
