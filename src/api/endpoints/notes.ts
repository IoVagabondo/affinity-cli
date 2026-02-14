import type { AffinityClient } from '../client';
import { noteSchema } from '../types';

export class NotesEndpoint {
  constructor(private readonly client: AffinityClient) {}

  async list(params: {
    personId?: string;
    organizationId?: string;
    opportunityId?: string;
  }): Promise<unknown> {
    return this.client.get('/notes', params);
  }

  async get(id: string): Promise<unknown> {
    return this.client.get(`/notes/${id}`, undefined, noteSchema);
  }

  async create(data: Record<string, unknown>): Promise<unknown> {
    return this.client.post('/notes', data, noteSchema);
  }
}
