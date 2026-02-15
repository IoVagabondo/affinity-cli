import { describe, expect, it } from 'vitest';
import { truncateText, withTruncatedNoteContent } from '../../src/utils/note-content';

describe('note-content utils', () => {
  it('truncates to max chars with compact whitespace', () => {
    const input = `${'a'.repeat(299)}   b   c`;
    const out = truncateText(input, 300);

    expect(out.length).toBe(300);
    expect(out.endsWith('...')).toBe(true);
  });

  it('leaves short text unchanged except whitespace normalization', () => {
    expect(truncateText('hello   world', 300)).toBe('hello world');
  });

  it('truncates note content field only', () => {
    const notes = [
      {
        id: '1',
        content: `${'x'.repeat(350)}`,
        person_ids: [123]
      },
      {
        id: '2',
        person_ids: [456]
      }
    ];

    const out = withTruncatedNoteContent(notes, 300);
    expect((out[0]?.content as string).length).toBe(300);
    expect(out[1]).toEqual({ id: '2', person_ids: [456] });
  });
});
