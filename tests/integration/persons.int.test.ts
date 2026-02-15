import { describe, expect, it } from 'vitest';
import { getClients, hasKey } from './helpers';

describe.runIf(hasKey())('integration: persons', () => {
  it('search persons succeeds', async () => {
    const { persons } = getClients();
    const results = await persons.search('test', undefined, 5);

    expect(Array.isArray(results.items)).toBe(true);
    expect(results.items.length).toBeLessThanOrEqual(5);
  });

  it('search persons supports page size', async () => {
    const { persons } = getClients();
    const results = await persons.search('a', undefined, 2);

    expect(Array.isArray(results.items)).toBe(true);
    expect(results.items.length).toBeLessThanOrEqual(2);
  });

  it('get person by id succeeds when person exists', async () => {
    const { persons } = getClients();

    // First search to get a valid ID
    const searchResults = await persons.search('test', undefined, 1);
    const first = searchResults.items[0];

    if (first) {
      const personId = String(first.id);
      const person = await persons.get(String(personId));

      expect(person).toBeTruthy();
      expect(person.id).toBe(personId);
    } else {
      // Skip test if no persons found
      expect(searchResults.items.length).toBe(0);
    }
  });
});

describe.runIf(hasKey())('integration: organizations', () => {
  it('search organizations succeeds', async () => {
    const { organizations } = getClients();
    const results = await organizations.search('tech', undefined, 5);

    expect(Array.isArray(results.items)).toBe(true);
  });

  it('search organizations supports additional params', async () => {
    const { organizations } = getClients();
    const results = await organizations.search(undefined, undefined, 5, { domain: 'example.com' });

    expect(Array.isArray(results.items)).toBe(true);
  });
});

describe.runIf(hasKey())('integration: opportunities', () => {
  it('search opportunities succeeds', async () => {
    const { opportunities } = getClients();
    const results = await opportunities.search('deal', undefined, 5);

    expect(Array.isArray(results.items)).toBe(true);
  });
});

describe.runIf(hasKey())('integration: lists', () => {
  it('list all lists succeeds', async () => {
    const { lists } = getClients();
    const results = await lists.listAll();

    expect(Array.isArray(results.items)).toBe(true);
  });

  it('get list by id succeeds when list exists', async () => {
    const { lists } = getClients();

    // First get all lists
    const allLists = await lists.listAll();
    const first = allLists.items[0];

    if (first) {
      const listId = String(first.id);
      const list = await lists.get(String(listId));

      expect(list).toBeTruthy();
      expect(list.id).toBe(listId);
    } else {
      // Skip test if no lists found
      expect(allLists.items.length).toBe(0);
    }
  });
});

describe.runIf(hasKey())('integration: fields', () => {
  it('list fields for persons succeeds', async () => {
    const { fields } = getClients();
    const results = await fields.list({ entityType: '0' }); // 0 = person

    expect(Array.isArray(results.items)).toBe(true);
  });

  it('list fields for organizations succeeds', async () => {
    const { fields } = getClients();
    const results = await fields.list({ entityType: '1' }); // 1 = organization

    expect(Array.isArray(results.items)).toBe(true);
  });
});

describe.skipIf(hasKey())('integration: entities (missing key)', () => {
  it('requires AFFINITY_API_KEY', () => {
    expect(hasKey()).toBe(false);
  });
});
