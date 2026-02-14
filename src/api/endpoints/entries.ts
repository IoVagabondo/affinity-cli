import type { AffinityClient } from '../client';
import { listEntrySchema, type ListEntry } from '../types';
import { nextPageTokenFromPayload, parseRecords } from '../../utils/response-shape';

export class EntriesEndpoint {
  constructor(private readonly client: AffinityClient) {}

  async list(
    listId: string,
    pageToken?: string,
    pageSize?: number
  ): Promise<{ items: ListEntry[]; nextPageToken?: string | null }> {
    const params: Record<string, unknown> = {};
    if (pageToken) params.page_token = pageToken;
    if (pageSize !== undefined) params.page_size = pageSize;

    const payload = await this.client.get<unknown>(`/lists/${listId}/list-entries`, params);
    return {
      items: parseRecords(payload, listEntrySchema),
      nextPageToken: nextPageTokenFromPayload(payload)
    };
  }

  async get(listId: string, entryId: string): Promise<ListEntry> {
    return this.client.get(`/lists/${listId}/list-entries/${entryId}`, undefined, listEntrySchema);
  }

  async add(listId: string, entityId: string): Promise<ListEntry> {
    return this.client.post(
      `/lists/${listId}/list-entries`,
      { entity_id: entityId },
      listEntrySchema
    );
  }

  async delete(listId: string, entryId: string): Promise<unknown> {
    return this.client.delete(`/lists/${listId}/list-entries/${entryId}`);
  }
}
