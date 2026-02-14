import type { AffinityClient } from '../client';
import { reminderSchema } from '../types';

export class RemindersEndpoint {
  constructor(private readonly client: AffinityClient) {}

  async list(params: Record<string, unknown> = {}): Promise<unknown> {
    return this.client.get('/reminders', params);
  }

  async get(id: string): Promise<unknown> {
    return this.client.get(`/reminders/${id}`, undefined, reminderSchema);
  }

  async create(data: Record<string, unknown>): Promise<unknown> {
    return this.client.post('/reminders', data, reminderSchema);
  }
}
