import type { AffinityClient } from '../client';
import { interactionSchema } from '../types';

export class InteractionsEndpoint {
  constructor(private readonly client: AffinityClient) {}

  async list(params: Record<string, unknown> = {}): Promise<unknown> {
    return this.client.get('/interactions', params);
  }

  async get(id: string): Promise<unknown> {
    return this.client.get(`/interactions/${id}`, undefined, interactionSchema);
  }

  async create(data: Record<string, unknown>): Promise<unknown> {
    return this.client.post('/interactions', data, interactionSchema);
  }
}
