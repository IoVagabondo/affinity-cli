import { describe, expect, it } from 'vitest';
import { parseJsonArg } from '../../src/utils/parse-json';

describe('parseJsonArg', () => {
  it('parses valid json', () => {
    expect(parseJsonArg<{ a: number }>('{"a":1}', '--data')).toEqual({ a: 1 });
  });

  it('throws on invalid json', () => {
    expect(() => parseJsonArg('{invalid}', '--value')).toThrow('Invalid JSON for --value');
  });
});
