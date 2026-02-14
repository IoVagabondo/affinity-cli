import { describe, expect, it } from 'vitest';
import { getClients, hasKey } from './helpers';

describe.runIf(hasKey())('integration: read-only resources', () => {
  it('person search returns array', async () => {
    const result = await getClients().persons.search('a');
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('organization search returns array', async () => {
    const result = await getClients().organizations.search('a');
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('opportunity search returns array', async () => {
    const result = await getClients().opportunities.search('a');
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('lists endpoint returns array', async () => {
    const result = await getClients().lists.listAll();
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('fields endpoint returns array', async () => {
    const result = await getClients().fields.list({});
    expect(Array.isArray(result.items)).toBe(true);
  });
});
