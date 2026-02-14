import type { Command } from 'commander';
import type { OrganizationsEndpoint } from '../api/endpoints/organizations';
import { registerEntityCommands } from './entity';
import type { ResolveEntityById } from '../utils/reference-resolution';

export const registerOrganizationCommands = (
  program: Command,
  endpoint: OrganizationsEndpoint,
  resolvePersonById?: (id: string) => Promise<Record<string, unknown>>,
  resolveOpportunityById?: ResolveEntityById,
  resolveListById?: ResolveEntityById
): void => {
  registerEntityCommands(
    program,
    'organization',
    endpoint,
    resolvePersonById,
    undefined,
    resolveOpportunityById,
    resolveListById
  );
};
