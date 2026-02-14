import type { AffinityClient } from '../client';
import {
  affinityEntitySchema,
  fieldSchema,
  fieldValueSchema,
  type AffinityEntity,
  type Field,
  type FieldValue
} from '../types';
import { nextPageTokenFromPayload, parseRecords } from '../../utils/response-shape';

export type EntityKind = 'person' | 'organization' | 'opportunity';

const routeByKind: Record<EntityKind, string> = {
  person: '/persons',
  organization: '/organizations',
  opportunity: '/opportunities'
};

const fieldRouteByKind: Partial<Record<EntityKind, string>> = {
  person: '/persons/fields',
  organization: '/organizations/fields'
};

const entityTypeByKind: Record<EntityKind, number> = {
  person: 0,
  organization: 1,
  opportunity: 8
};

const idParamByKind: Record<EntityKind, string> = {
  person: 'person_id',
  organization: 'organization_id',
  opportunity: 'opportunity_id'
};

export class EntitiesEndpoint {
  constructor(
    private readonly client: AffinityClient,
    private readonly kind: EntityKind
  ) {}

  async search(
    term: string | undefined,
    pageToken?: string,
    pageSize?: number,
    extraParams?: Record<string, unknown>
  ): Promise<{ items: AffinityEntity[]; nextPageToken?: string | null }> {
    const payload = await this.client.get<unknown>(routeByKind[this.kind], {
      term,
      page_token: pageToken,
      page_size: pageSize,
      ...extraParams
    });

    return {
      items: parseRecords(payload, affinityEntitySchema),
      nextPageToken: nextPageTokenFromPayload(payload)
    };
  }

  async get(id: string, params?: Record<string, unknown>): Promise<AffinityEntity> {
    return this.client.get(`${routeByKind[this.kind]}/${id}`, params, affinityEntitySchema);
  }

  async create(data: Record<string, unknown>): Promise<AffinityEntity> {
    return this.client.post(routeByKind[this.kind], data, affinityEntitySchema);
  }

  async update(id: string, data: Record<string, unknown>): Promise<AffinityEntity> {
    return this.client.put(`${routeByKind[this.kind]}/${id}`, data, affinityEntitySchema);
  }

  async delete(id: string): Promise<unknown> {
    return this.client.delete(`${routeByKind[this.kind]}/${id}`);
  }

  async getFieldValues(id: string): Promise<FieldValue[]> {
    const payload = await this.client.get<unknown>('/field-values', {
      [idParamByKind[this.kind]]: id
    });

    return parseRecords(payload, fieldValueSchema);
  }

  async getFieldDefinitions(): Promise<Field[]> {
    const dedicatedRoute = fieldRouteByKind[this.kind];
    if (dedicatedRoute) {
      const payload = await this.client.get<unknown>(dedicatedRoute);
      return parseRecords(payload, fieldSchema);
    }

    const payload = await this.client.get<unknown>('/fields', {
      entity_type: entityTypeByKind[this.kind],
      list_id: null
    });
    return parseRecords(payload, fieldSchema);
  }
}
