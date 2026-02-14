import type { AffinityClient } from '../client';
import { EntitiesEndpoint } from './entities';

export class OrganizationsEndpoint extends EntitiesEndpoint {
  constructor(client: AffinityClient) {
    super(client, 'organization');
  }
}
