import type { AffinityClient } from '../client';

export class RelationshipsStrengthsEndpoint {
  constructor(private readonly client: AffinityClient) {}

  async listByExternalId(externalId: string): Promise<Array<Record<string, unknown>>> {
    const payload = await this.client.get<unknown>('/relationships-strengths', {
      external_id: externalId
    });
    if (!Array.isArray(payload)) return [];
    return payload.filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
    );
  }
}
