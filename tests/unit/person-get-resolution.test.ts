import { describe, expect, it } from 'vitest';
import {
  resolveNestedArrayForeignKeyField,
  resolveRecordIdField,
  summarizeListReference,
  summarizeOrganizationReference
} from '../../src/utils/reference-resolution';

describe('person get resolution helpers', () => {
  it('resolves both current and linked organization ids', async () => {
    const person = {
      id: '97844218',
      current_organization_ids: [304495417],
      organization_ids: [284919394, 304495417]
    };

    const resolveOrg = async (id: string) => ({
      id,
      name: id === '304495417' ? 'Example Org' : 'Example Partner',
      domain: id === '304495417' ? 'example.org' : 'partner.example'
    });

    const withCurrent = await resolveRecordIdField(person, {
      idsField: 'current_organization_ids',
      targetField: 'current_organizations',
      resolveById: resolveOrg,
      buildSummary: summarizeOrganizationReference
    });
    const withAll = await resolveRecordIdField(withCurrent, {
      idsField: 'organization_ids',
      targetField: 'organizations',
      resolveById: resolveOrg,
      buildSummary: summarizeOrganizationReference
    });

    expect(withAll).toEqual({
      id: '97844218',
      current_organizations: [{ id: '304495417', name: 'Example Org', domain: 'example.org' }],
      organizations: [
        { id: '284919394', name: 'Example Partner', domain: 'partner.example' },
        { id: '304495417', name: 'Example Org', domain: 'example.org' }
      ]
    });
  });

  it('resolves list_entries list id to list object while keeping list_id', async () => {
    const person = {
      id: '97844218',
      list_entries: [
        { id: 45738529, list_id: 133047, entity_id: 97844218 },
        { id: 123, list_id: 133047, entity_id: 97844218 }
      ]
    };

    const calls: string[] = [];
    const resolved = await resolveNestedArrayForeignKeyField(person, {
      arrayField: 'list_entries',
      idField: 'list_id',
      targetField: 'list',
      resolveById: async (id) => {
        calls.push(id);
        return { id, name: 'Target Accounts', entity_type: 0 };
      },
      buildSummary: summarizeListReference,
      dropSourceField: false
    });

    expect(calls).toEqual(['133047']);
    expect(resolved).toEqual({
      id: '97844218',
      list_entries: [
        {
          id: 45738529,
          list_id: 133047,
          entity_id: 97844218,
          list: { id: '133047', name: 'Target Accounts', entity_type: 0 }
        },
        {
          id: 123,
          list_id: 133047,
          entity_id: 97844218,
          list: { id: '133047', name: 'Target Accounts', entity_type: 0 }
        }
      ]
    });
  });
});
