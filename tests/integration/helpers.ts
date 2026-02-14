import dotenv from 'dotenv';
import { AffinityClient } from '../../src/api/client';
import { AuthEndpoint } from '../../src/api/endpoints/auth';
import { PersonsEndpoint } from '../../src/api/endpoints/persons';
import { OrganizationsEndpoint } from '../../src/api/endpoints/organizations';
import { OpportunitiesEndpoint } from '../../src/api/endpoints/opportunities';
import { ListsEndpoint } from '../../src/api/endpoints/lists';
import { FieldsEndpoint } from '../../src/api/endpoints/fields';

dotenv.config({ quiet: true });

export const hasKey = (): boolean => Boolean(process.env.AFFINITY_API_KEY);

export const getClients = () => {
  const client = new AffinityClient({
    apiKey: process.env.AFFINITY_API_KEY,
    authMode: (process.env.AFFINITY_AUTH_MODE as 'basic' | 'bearer' | undefined) ?? 'basic'
  });

  return {
    auth: new AuthEndpoint(client),
    persons: new PersonsEndpoint(client),
    organizations: new OrganizationsEndpoint(client),
    opportunities: new OpportunitiesEndpoint(client),
    lists: new ListsEndpoint(client),
    fields: new FieldsEndpoint(client)
  };
};
