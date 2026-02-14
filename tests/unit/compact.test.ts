import { describe, expect, it } from 'vitest';
import { compactData } from '../../src/formatters/compact';

describe('compactData', () => {
  it('flattens title and name objects', () => {
    const input = {
      status: { title: 'Active', id: 123 },
      owner: { name: 'Jane Doe', id: 20 }
    };

    expect(compactData(input)).toEqual({
      status: 'Active',
      owner: 'Jane Doe'
    });
  });

  it('formats location objects and removes metadata keys', () => {
    const input = {
      office: { city: 'New York', state: 'NY', country: 'US' },
      created_at: '2024-01-01',
      test_marker: 'ignore'
    };

    expect(compactData(input)).toEqual({
      office: 'New York, NY, US'
    });
  });

  it('drops interactions when they duplicate interaction_dates', () => {
    const input = {
      interaction_dates: {
        first_email_date: '2026-01-01T00:00:00Z',
        last_email_date: '2026-02-01T00:00:00Z'
      },
      interactions: {
        first_email: { date: '2026-01-01T00:00:00Z' },
        last_email: { date: '2026-02-01T00:00:00Z', person_ids: [] }
      }
    };

    expect(compactData(input)).toEqual({
      interaction_dates: {
        first_email_date: '2026-01-01T00:00:00Z',
        last_email_date: '2026-02-01T00:00:00Z'
      }
    });
  });

  it('keeps interactions when person_ids are present', () => {
    const input = {
      interaction_dates: {
        last_email_date: '2026-02-01T00:00:00Z'
      },
      interactions: {
        last_email: { date: '2026-02-01T00:00:00Z', person_ids: [123] }
      }
    };

    expect(compactData(input)).toEqual(input);
  });

  it('keeps interactions when resolved persons are present', () => {
    const input = {
      interaction_dates: {
        last_email_date: '2026-02-01T00:00:00Z'
      },
      interactions: {
        last_email: { date: '2026-02-01T00:00:00Z', persons: [{ id: '123', name: 'Jane Doe' }] }
      }
    };

    expect(compactData(input)).toEqual({
      interaction_dates: {
        last_email_date: '2026-02-01T00:00:00Z'
      },
      interactions: {
        last_email: { date: '2026-02-01T00:00:00Z', persons: ['Jane Doe'] }
      }
    });
  });

  it('keeps interactions when dates do not match interaction_dates', () => {
    const input = {
      interaction_dates: {
        last_email_date: '2026-02-01T00:00:00Z'
      },
      interactions: {
        last_email: { date: '2026-02-02T00:00:00Z' }
      }
    };

    expect(compactData(input)).toEqual(input);
  });
});
