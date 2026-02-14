import type { Command } from 'commander';
import type { PersonsEndpoint } from '../api/endpoints/persons';
import { registerEntityCommands } from './entity';
import type { ResolveEntityById } from '../utils/reference-resolution';

export const registerPersonCommands = (
  program: Command,
  endpoint: PersonsEndpoint,
  resolveOrganizationById?: ResolveEntityById,
  resolveOpportunityById?: ResolveEntityById,
  resolveListById?: ResolveEntityById,
  resolveRelationshipStrengthsByExternalId?: (id: string) => Promise<Array<Record<string, unknown>>>
): void => {
  registerEntityCommands(
    program,
    'person',
    endpoint,
    async (id) => endpoint.get(id) as Promise<Record<string, unknown>>,
    resolveOrganizationById,
    resolveOpportunityById,
    resolveListById,
    resolveRelationshipStrengthsByExternalId
  );
};
