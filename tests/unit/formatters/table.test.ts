import { describe, expect, it } from 'vitest';
import { formatTable } from '../../../src/formatters/table';

describe('formatTable', () => {
  it('formats empty array as empty string', () => {
    expect(formatTable([])).toBe('');
  });

  it('formats single object as table', () => {
    const data = { id: 1, name: 'Test', email: 'test@example.com' };
    const result = formatTable(data);

    expect(result).toContain('id');
    expect(result).toContain('name');
    expect(result).toContain('email');
    expect(result).toContain('1');
    expect(result).toContain('Test');
    expect(result).toContain('test@example.com');
  });

  it('formats array of objects as table', () => {
    const data = [
      { id: 1, name: 'Alice', active: true },
      { id: 2, name: 'Bob', active: false }
    ];
    const result = formatTable(data);

    expect(result).toContain('id');
    expect(result).toContain('name');
    expect(result).toContain('active');
    expect(result).toContain('1');
    expect(result).toContain('Alice');
    expect(result).toContain('2');
    expect(result).toContain('Bob');
    expect(result).toContain('true');
    expect(result).toContain('false');
  });

  it('handles null and undefined values', () => {
    const data = [{ id: 1, name: null, email: undefined }];
    const result = formatTable(data);

    expect(result).toContain('id');
    expect(result).toContain('name');
    expect(result).toContain('email');
    expect(result).toContain('1');
    // Null and undefined should be rendered as empty strings in cells
  });

  it('stringifies nested objects as JSON', () => {
    const data = [
      {
        id: 1,
        name: 'Test',
        metadata: { key: 'value', nested: { deep: true } }
      }
    ];
    const result = formatTable(data);

    expect(result).toContain('id');
    expect(result).toContain('name');
    expect(result).toContain('metadata');
    expect(result).toContain('1');
    expect(result).toContain('Test');
    // Nested object should be JSON stringified
    expect(result).toContain('key');
    expect(result).toContain('value');
  });

  it('handles array of primitives', () => {
    const data = ['one', 'two', 'three'];
    const result = formatTable(data);

    expect(result).toContain('one');
    expect(result).toContain('two');
    expect(result).toContain('three');
  });

  it('handles single primitive value', () => {
    const result = formatTable('test');

    expect(result).toBe('test');
  });

  it('handles numbers', () => {
    const data = [{ id: 1, count: 42, price: 99.99 }];
    const result = formatTable(data);

    expect(result).toContain('id');
    expect(result).toContain('count');
    expect(result).toContain('price');
    expect(result).toContain('1');
    expect(result).toContain('42');
    expect(result).toContain('99.99');
  });

  it('handles boolean values', () => {
    const data = [{ active: true, deleted: false }];
    const result = formatTable(data);

    expect(result).toContain('active');
    expect(result).toContain('deleted');
    expect(result).toContain('true');
    expect(result).toContain('false');
  });

  it('uses keys from first object as headers', () => {
    const data = [
      { id: 1, name: 'Alice', extra: 'value' },
      { id: 2, name: 'Bob' } // Missing 'extra' field
    ];
    const result = formatTable(data);

    // Headers should be based on first object
    expect(result).toContain('id');
    expect(result).toContain('name');
    expect(result).toContain('extra');
  });

  it('handles empty object', () => {
    const result = formatTable({});

    // Should create table with no columns
    expect(result).toBeDefined();
  });

  it('handles array with null elements', () => {
    const data = [null, undefined, 'test'];
    const result = formatTable(data);

    expect(result).toContain('test');
  });
});
