import { describe, expect, it } from 'vitest';
import {
  resolveRecordIdField,
  resolveRecordsIdField,
  summarizeOpportunityResolvedReference,
  summarizeOpportunityReference,
  summarizePersonReference,
  summarizeOrganizationReference
} from '../../src/utils/reference-resolution';

describe('reference-resolution', () => {
  it('resolves current_organization_ids into current_organizations', async () => {
    const record = {
      id: '97844218',
      current_organization_ids: [304495417]
    };

    const resolved = await resolveRecordIdField(record, {
      idsField: 'current_organization_ids',
      targetField: 'current_organizations',
      resolveById: async (id) => ({
        id,
        name: 'Example Org',
        domain: 'example.org',
        domains: ['example.org']
      }),
      buildSummary: summarizeOrganizationReference
    });

    expect(resolved).toEqual({
      id: '97844218',
      current_organizations: [
        {
          id: '304495417',
          name: 'Example Org',
          domain: 'example.org',
          domains: ['example.org']
        }
      ]
    });
  });

  it('resolves ids once across multiple records', async () => {
    const calls: string[] = [];
    const records = [{ current_organization_ids: [1, 2] }, { current_organization_ids: [2, 1] }];

    await resolveRecordsIdField(records, {
      idsField: 'current_organization_ids',
      targetField: 'current_organizations',
      resolveById: async (id) => {
        calls.push(id);
        return { id, name: `Org ${id}` };
      },
      buildSummary: summarizeOrganizationReference
    });

    expect(calls.sort()).toEqual(['1', '2']);
  });

  it('falls back to id-only reference when resolver fails', async () => {
    const record = {
      current_organization_ids: [1]
    };

    const resolved = await resolveRecordIdField(record, {
      idsField: 'current_organization_ids',
      targetField: 'current_organizations',
      resolveById: async () => {
        throw new Error('not found');
      },
      buildSummary: summarizeOrganizationReference
    });

    expect(resolved).toEqual({
      current_organizations: [{ id: '1' }]
    });
  });

  it('summarizes person references with primary email', async () => {
    const record = {
      person_ids: [97814168]
    };

    const resolved = await resolveRecordIdField(record, {
      idsField: 'person_ids',
      targetField: 'persons',
      resolveById: async (id) => ({
        id,
        first_name: 'Sample',
        last_name: 'User',
        primary_email: 'sample.user@example.com'
      }),
      buildSummary: summarizePersonReference
    });

    expect(resolved).toEqual({
      persons: [
        {
          id: '97814168',
          name: 'Sample User',
          first_name: 'Sample',
          last_name: 'User',
          primary_email: 'sample.user@example.com'
        }
      ]
    });
  });

  it('summarizes opportunity references with linked ids', async () => {
    const record = {
      opportunity_ids: [100574261]
    };

    const resolved = await resolveRecordIdField(record, {
      idsField: 'opportunity_ids',
      targetField: 'opportunities',
      resolveById: async (id) => ({
        id,
        name: 'Example Opportunity',
        person_ids: [244518312, 251779079],
        organization_ids: [291792102]
      }),
      buildSummary: summarizeOpportunityReference
    });

    expect(resolved).toEqual({
      opportunities: [
        {
          id: '100574261',
          name: 'Example Opportunity',
          person_ids: ['244518312', '251779079'],
          organization_ids: ['291792102']
        }
      ]
    });
  });

  it('keeps resolved opportunity payload shape for get-level resolution', async () => {
    const record = {
      opportunity_ids: [100574261]
    };

    const resolved = await resolveRecordIdField(record, {
      idsField: 'opportunity_ids',
      targetField: 'opportunities',
      resolveById: async (id) => ({
        id,
        name: 'Example Opportunity',
        list_entries: [{ id: 231278850, list_id: 314724, entity_type: 8 }],
        person_ids: [244518312, 251779079],
        organization_ids: [291792102]
      }),
      buildSummary: summarizeOpportunityResolvedReference
    });

    expect(resolved).toEqual({
      opportunities: [
        {
          id: '100574261',
          name: 'Example Opportunity',
          list_entries: [{ id: 231278850, list_id: 314724, entity_type: 8 }],
          person_ids: ['244518312', '251779079'],
          organization_ids: ['291792102']
        }
      ]
    });
  });
});
