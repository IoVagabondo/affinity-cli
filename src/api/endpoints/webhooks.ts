import type { AffinityClient } from '../client';

export class WebhooksEndpoint {
  constructor(private readonly client: AffinityClient) {}

  async list(): Promise<unknown> {
    return this.client.get('/webhook');
  }
}
