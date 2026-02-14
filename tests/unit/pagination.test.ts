import { describe, expect, it } from 'vitest';
import { collectAllPages, pickRecords } from '../../src/utils/pagination';

describe('pagination utils', () => {
  it('collects records across page tokens', async () => {
    const calls: string[] = [];
    const items = await collectAllPages(async (token) => {
      calls.push(token ?? 'first');
      if (!token) {
        return { items: [1, 2], nextPageToken: 't2' };
      }
      return { items: [3], nextPageToken: null };
    });

    expect(items).toEqual([1, 2, 3]);
    expect(calls).toEqual(['first', 't2']);
  });

  it('picks records from records/results/data keys', () => {
    expect(pickRecords({ records: [1] })).toEqual([1]);
    expect(pickRecords({ results: [2] })).toEqual([2]);
    expect(pickRecords({ data: [3] })).toEqual([3]);
  });
});
