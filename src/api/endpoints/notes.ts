import type { AffinityClient } from '../client';
import { noteSchema } from '../types';
import { nextPageTokenFromPayload, parseRecords } from '../../utils/response-shape';

export type NoteListParams = {
  personId?: string;
  organizationId?: string;
  opportunityId?: string;
  creatorId?: string;
  pageSize?: number;
  pageToken?: string;
};

export class NotesEndpoint {
  constructor(private readonly client: AffinityClient) {}

  async list(
    params: NoteListParams = {}
  ): Promise<{ items: Array<Record<string, unknown>>; nextPageToken?: string | null }> {
    const payload = await this.client.get<unknown>('/notes', {
      person_id: params.personId,
      organization_id: params.organizationId,
      opportunity_id: params.opportunityId,
      creator_id: params.creatorId,
      page_size: params.pageSize,
      page_token: params.pageToken
    });

    return {
      items: parseRecords(payload, noteSchema),
      nextPageToken: nextPageTokenFromPayload(payload)
    };
  }

  async get(id: string): Promise<Record<string, unknown>> {
    return this.client.get(`/notes/${id}`, undefined, noteSchema);
  }

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.client.post('/notes', data, noteSchema);
  }

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.client.put(`/notes/${id}`, data, noteSchema);
  }

  async delete(id: string): Promise<unknown> {
    return this.client.delete(`/notes/${id}`);
  }
}
