import type { AffinityClient } from '../client';
import { fieldValueSchema, type FieldValue } from '../types';
import { nextPageTokenFromPayload, parseRecords } from '../../utils/response-shape';

export class FieldValuesEndpoint {
  constructor(private readonly client: AffinityClient) {}

  async list(params: {
    personId?: string;
    orgId?: string;
    oppId?: string;
    entryId?: string;
    pageToken?: string;
  }): Promise<{ items: FieldValue[]; nextPageToken?: string | null }> {
    const payload = await this.client.get<unknown>('/field-values', {
      person_id: params.personId,
      organization_id: params.orgId,
      opportunity_id: params.oppId,
      list_entry_id: params.entryId,
      page_token: params.pageToken
    });

    return {
      items: parseRecords(payload, fieldValueSchema),
      nextPageToken: nextPageTokenFromPayload(payload)
    };
  }

  async update(id: string, value: unknown): Promise<FieldValue> {
    return this.client.put(`/field-values/${id}`, { value }, fieldValueSchema);
  }
}
