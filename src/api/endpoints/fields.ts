import type { AffinityClient } from '../client';
import { fieldSchema, type Field } from '../types';
import { nextPageTokenFromPayload, parseRecords } from '../../utils/response-shape';

export class FieldsEndpoint {
  constructor(private readonly client: AffinityClient) {}

  async list(params: {
    entityType?: string;
    listId?: string;
    pageToken?: string;
  }): Promise<{ items: Field[]; nextPageToken?: string | null }> {
    const payload = await this.client.get<unknown>('/fields', {
      entity_type: params.entityType,
      list_id: params.listId,
      page_token: params.pageToken
    });

    return {
      items: parseRecords(payload, fieldSchema),
      nextPageToken: nextPageTokenFromPayload(payload)
    };
  }

  async create(data: Record<string, unknown>): Promise<Field> {
    return this.client.post('/fields', data, fieldSchema);
  }

  async delete(id: string): Promise<unknown> {
    return this.client.delete(`/fields/${id}`);
  }
}
