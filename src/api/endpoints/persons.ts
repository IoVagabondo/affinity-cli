import type { AffinityClient } from '../client';
import { EntitiesEndpoint } from './entities';

export class PersonsEndpoint extends EntitiesEndpoint {
  constructor(client: AffinityClient) {
    super(client, 'person');
  }
}
