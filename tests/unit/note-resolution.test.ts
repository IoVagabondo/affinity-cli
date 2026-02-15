import { describe, expect, it } from 'vitest';
import {
  resolveNoteByMode,
  resolveNotesByMode,
  resolveNotesDetailed,
  resolveNotesFull
} from '../../src/utils/note-resolution';

describe('note-resolution', () => {
  it('keeps raw notes unchanged', async () => {
    const note = { id: '1', person_ids: [123], content: 'example' };
    const resolved = await resolveNoteByMode(note, 'raw', {
      resolvePersonById: async () => {
        throw new Error('resolver should not run');
      }
    });

    expect(resolved).toEqual(note);
  });

  it('resolves linked references in detailed mode', async () => {
    const resolved = await resolveNotesDetailed(
      [
        {
          id: '22984',
          person_ids: [38708, 24809],
          associated_person_ids: [38708],
          interaction_person_ids: [24809],
          mentioned_person_ids: [49817],
          organization_ids: [64779194],
          opportunity_ids: [117]
        }
      ],
      {
        resolvePersonById: async (id) => ({
          id,
          first_name: id === '38708' ? 'Jane' : 'Alex',
          last_name: 'Example',
          primary_email: `${id}@example.com`
        }),
        resolveOrganizationById: async (id) => ({ id, name: 'Example Org', domain: 'example.org' }),
        resolveOpportunityById: async (id) => ({
          id,
          name: 'Example Opportunity',
          person_ids: [38708],
          organization_ids: [64779194]
        })
      }
    );

    expect(resolved[0]).toMatchObject({
      person_ids: [38708, 24809],
      associated_person_ids: [38708],
      interaction_person_ids: [24809],
      mentioned_person_ids: [49817],
      organization_ids: [64779194],
      opportunity_ids: [117],
      persons: [
        {
          id: '38708',
          name: 'Jane Example',
          primary_email: '38708@example.com'
        },
        {
          id: '24809',
          name: 'Alex Example',
          primary_email: '24809@example.com'
        }
      ],
      associated_persons: [{ id: '38708', name: 'Jane Example' }],
      interaction_persons: [{ id: '24809', name: 'Alex Example' }],
      mentioned_persons: [{ id: '49817', name: 'Alex Example' }],
      organizations: [{ id: '64779194', name: 'Example Org', domain: 'example.org' }],
      opportunities: [
        {
          id: '117',
          name: 'Example Opportunity',
          person_ids: ['38708'],
          organization_ids: ['64779194']
        }
      ]
    });
  });

  it('resolves interaction and parent note in full mode', async () => {
    const resolved = await resolveNotesFull(
      [
        {
          id: '22984',
          interaction_id: 114,
          parent_id: 10001
        }
      ],
      {
        resolveInteractionById: async (id) => ({
          id,
          type: 0,
          date: '2026-02-14T08:42:27.000-08:00'
        }),
        resolveNoteById: async (id) => ({
          id,
          content: 'Parent note content',
          type: 0,
          created_at: '2026-02-01T00:00:00.000-08:00',
          updated_at: '2026-02-02T00:00:00.000-08:00'
        })
      }
    );

    expect(resolved[0]).toMatchObject({
      interaction_id: 114,
      interaction: {
        id: '114',
        type: 0,
        date: '2026-02-14T08:42:27.000-08:00'
      },
      parent_id: 10001,
      parent_note: {
        id: '10001',
        content: 'Parent note content',
        type: 0,
        created_at: '2026-02-01T00:00:00.000-08:00',
        updated_at: '2026-02-02T00:00:00.000-08:00'
      }
    });
  });

  it('memoizes person resolution across note person fields', async () => {
    const calls: string[] = [];

    await resolveNotesByMode(
      [
        {
          id: '1',
          person_ids: [38708],
          mentioned_person_ids: [38708],
          associated_person_ids: [38708],
          interaction_person_ids: [38708]
        }
      ],
      'detailed',
      {
        resolvePersonById: async (id) => {
          calls.push(id);
          return { id, first_name: 'Jane', last_name: 'Example' };
        }
      }
    );

    expect(calls).toEqual(['38708']);
  });
});
