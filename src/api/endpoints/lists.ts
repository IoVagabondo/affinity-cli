import type { AffinityClient } from '../client';
import { listSchema, type List } from '../types';
import { nextPageTokenFromPayload, parseRecords } from '../../utils/response-shape';

export class ListsEndpoint {
  constructor(private readonly client: AffinityClient) {}

  async listAll(pageToken?: string): Promise<{ items: List[]; nextPageToken?: string | null }> {
    const payload = await this.client.get<unknown>('/lists', { page_token: pageToken });
    return {
      items: parseRecords(payload, listSchema),
      nextPageToken: nextPageTokenFromPayload(payload)
    };
  }

  async get(id: string): Promise<List> {
    return this.client.get(`/lists/${id}`, undefined, listSchema);
  }

  async create(input: {
    name: string;
    type: 'person' | 'organization' | 'opportunity';
    isPrivate?: boolean;
  }): Promise<List> {
    const body = {
      name: input.name,
      entity_type: input.type,
      list_type: 'dynamic',
      public: input.isPrivate === undefined ? undefined : !input.isPrivate
    };
    return this.client.post('/lists', body, listSchema);
  }
}
