import { describe, expect, it } from 'vitest';
import { compileEntity } from '../../src/utils/compiled-entity';
import type { AffinityEntity, Field, FieldValue } from '../../src/api/types';

describe('compileEntity', () => {
  it('maps field IDs to field names and normalizes common value objects', async () => {
    const entity: AffinityEntity = {
      id: '284048313',
      name: 'ExampleCo'
    };

    const fields: Field[] = [
      { id: '2055517', name: 'Status' },
      { id: '2055488', name: 'Location' }
    ];

    const fieldValues: FieldValue[] = [
      {
        id: '1',
        field_id: '2055517',
        value: { id: 123, text: 'Active' }
      },
      {
        id: '2',
        field_id: '2055488',
        value: { city: 'Hamburg', state: 'Hamburg', country: 'Germany' }
      },
      {
        id: '3',
        field_id: '2055517',
        value: null
      }
    ];

    await expect(compileEntity(entity, fieldValues, fields)).resolves.toEqual({
      id: '284048313',
      name: 'ExampleCo',
      fields: {
        Status: 'Active',
        Location: 'Hamburg, Hamburg, Germany'
      }
    });
  });

  it('aggregates repeated field values and falls back to field-based keys', async () => {
    const entity: AffinityEntity = {
      id: '1',
      name: 'Example Org'
    };

    const fields: Field[] = [{ id: '2055482', name: 'Investors' }];

    const fieldValues: FieldValue[] = [
      {
        id: '10',
        field_id: '2055482',
        value: 'Investor A'
      },
      {
        id: '11',
        field_id: '2055482',
        value: 'Investor B'
      },
      {
        id: '12',
        field_id: '999999',
        value: 'Unknown Field Value'
      },
      {
        id: '13',
        field_id: null,
        value: 'No Field ID'
      }
    ];

    await expect(compileEntity(entity, fieldValues, fields)).resolves.toEqual({
      id: '1',
      name: 'Example Org',
      fields: {
        Investors: ['Investor A', 'Investor B'],
        field_999999: 'Unknown Field Value',
        field_value_13: 'No Field ID'
      }
    });
  });

  it('resolves person-reference values when resolver is provided', async () => {
    const entity: AffinityEntity = {
      id: '1',
      name: 'Example Org'
    };

    const fields: Field[] = [{ id: '2055479', name: 'Source of Introduction', value_type: 0 }];

    const fieldValues: FieldValue[] = [
      {
        id: '1',
        field_id: '2055479',
        value: 97814168
      }
    ];

    await expect(
      compileEntity(entity, fieldValues, fields, async (id) => ({
        id,
        first_name: 'Sample',
        last_name: 'User'
      }))
    ).resolves.toEqual({
      id: '1',
      name: 'Example Org',
      fields: {
        'Source of Introduction': 'Sample User'
      }
    });
  });
});
