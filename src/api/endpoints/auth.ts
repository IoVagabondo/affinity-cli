import type { AffinityClient } from '../client';
import { rateLimitSchema, whoamiSchema } from '../types';

export class AuthEndpoint {
  constructor(private readonly client: AffinityClient) {}

  async whoami(): Promise<unknown> {
    return this.client.get('/auth/whoami', undefined, whoamiSchema);
  }

  async rateLimit(): Promise<unknown> {
    return this.client.get('/rate-limit', undefined, rateLimitSchema);
  }
}
