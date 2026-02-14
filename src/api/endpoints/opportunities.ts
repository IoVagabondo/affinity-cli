import type { AffinityClient } from '../client';
import { EntitiesEndpoint } from './entities';

export class OpportunitiesEndpoint extends EntitiesEndpoint {
  constructor(client: AffinityClient) {
    super(client, 'opportunity');
  }
}
