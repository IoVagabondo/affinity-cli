import type { AffinityClient } from '../client';

export class FilesEndpoint {
  constructor(private readonly client: AffinityClient) {}

  async list(params: Record<string, unknown> = {}): Promise<unknown> {
    return this.client.get('/entity-files', params);
  }
}
