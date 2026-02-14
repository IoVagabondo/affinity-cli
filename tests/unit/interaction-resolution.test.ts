import { describe, expect, it } from 'vitest';
import {
  resolveInteractionPersons,
  resolvePersonIds
} from '../../src/utils/interaction-resolution';
import { summarizeInteractionPersonReference } from '../../src/utils/reference-resolution';

describe('resolveInteractionPersons', () => {
  it('resolves person_ids into person objects and removes raw ids', async () => {
    const input = [
      {
        id: '1',
        interactions: {
          last_email: { date: '2026-02-14T08:42:27.000-08:00', person_ids: [97814168, 102953748] }
        }
      }
    ];

    const resolved = await resolveInteractionPersons(input, async (id) => {
      return {
        id,
        first_name: id === '97814168' ? 'Alice' : 'Bob',
        last_name: 'Example',
        primary_email: `${id}@example.com`
      };
    });

    expect(resolved[0]?.interactions).toEqual({
      last_email: {
        date: '2026-02-14T08:42:27.000-08:00',
        persons: [
          {
            id: '97814168',
            name: 'Alice Example',
            first_name: 'Alice',
            last_name: 'Example',
            primary_email: '97814168@example.com'
          },
          {
            id: '102953748',
            name: 'Bob Example',
            first_name: 'Bob',
            last_name: 'Example',
            primary_email: '102953748@example.com'
          }
        ]
      }
    });
  });

  it('falls back to id-only person when resolver fails', async () => {
    const input = [
      {
        id: '1',
        interactions: {
          next_event: { date: '2026-05-21T00:30:00.000-07:00', person_ids: [123] }
        }
      }
    ];

    const resolved = await resolveInteractionPersons(input, async () => {
      throw new Error('Not found');
    });

    expect(resolved[0]?.interactions).toEqual({
      next_event: {
        date: '2026-05-21T00:30:00.000-07:00',
        persons: [{ id: '123' }]
      }
    });
  });

  it('replaces empty person_ids arrays with persons arrays', async () => {
    const input = [
      {
        id: '1',
        interactions: {
          first_email: { date: '2026-01-01T00:00:00Z', person_ids: [] }
        }
      }
    ];

    const resolved = await resolveInteractionPersons(input, async (id) => ({ id }));

    expect(resolved[0]?.interactions).toEqual({
      first_email: {
        date: '2026-01-01T00:00:00Z',
        persons: []
      }
    });
  });

  it('resolves each unique id once across records', async () => {
    const calls: string[] = [];
    const input = [
      {
        interactions: {
          first_email: { date: '2026-01-01T00:00:00Z', person_ids: [1, 2] }
        }
      },
      {
        interactions: {
          last_email: { date: '2026-02-01T00:00:00Z', person_ids: [2, 1] }
        }
      }
    ];

    await resolveInteractionPersons(input, async (id) => {
      calls.push(id);
      return { id, first_name: id };
    });

    expect(calls.sort()).toEqual(['1', '2']);
  });

  it('supports slim interaction summaries without emails arrays', async () => {
    const input = [
      {
        interactions: {
          last_email: { date: '2026-02-01T00:00:00Z', person_ids: [1] }
        }
      }
    ];

    const resolved = await resolveInteractionPersons(
      input,
      async (id) => ({
        id,
        first_name: 'Jane',
        last_name: 'Doe',
        primary_email: 'jane@example.com',
        emails: ['jane@example.com', 'jane+1@example.com']
      }),
      summarizeInteractionPersonReference
    );

    expect(resolved[0]?.interactions).toEqual({
      last_email: {
        date: '2026-02-01T00:00:00Z',
        persons: [{ id: '1', name: 'Jane Doe', primary_email: 'jane@example.com' }]
      }
    });
  });

  it('resolves top-level person id lists', async () => {
    const resolved = await resolvePersonIds([97814168, 205061870], async (id) => {
      return {
        id,
        first_name: id === '97814168' ? 'Sample' : 'Alex',
        last_name: id === '97814168' ? 'User' : 'Reviewer'
      };
    });

    expect(resolved).toEqual([
      {
        id: '97814168',
        name: 'Sample User',
        first_name: 'Sample',
        last_name: 'User'
      },
      {
        id: '205061870',
        name: 'Alex Reviewer',
        first_name: 'Alex',
        last_name: 'Reviewer'
      }
    ]);
  });
});
