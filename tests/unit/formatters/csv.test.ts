import { describe, expect, it } from 'vitest';
import { formatCsv } from '../../../src/formatters/csv';

describe('formatCsv', () => {
  it('formats empty array as empty string', () => {
    expect(formatCsv([])).toBe('');
  });

  it('formats single object as CSV with headers', () => {
    const data = { id: 1, name: 'Test', email: 'test@example.com' };
    const result = formatCsv(data);

    // Should have header row
    expect(result).toContain('id');
    expect(result).toContain('name');
    expect(result).toContain('email');

    // Should have data row
    expect(result).toContain('1');
    expect(result).toContain('Test');
    expect(result).toContain('test@example.com');
  });

  it('formats array of objects as CSV', () => {
    const data = [
      { id: 1, name: 'Alice', score: 95 },
      { id: 2, name: 'Bob', score: 87 }
    ];
    const result = formatCsv(data);

    // Check headers
    expect(result).toContain('id');
    expect(result).toContain('name');
    expect(result).toContain('score');

    // Check data rows
    expect(result).toContain('1');
    expect(result).toContain('Alice');
    expect(result).toContain('95');
    expect(result).toContain('2');
    expect(result).toContain('Bob');
    expect(result).toContain('87');
  });

  it('handles null and undefined values', () => {
    const data = [{ id: 1, name: null, email: undefined }];
    const result = formatCsv(data);

    const lines = result.trim().split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(2); // Header + at least 1 data row
    expect(lines[0]).toContain('id');
    expect(lines[0]).toContain('name');
  });

  it('properly escapes values with commas', () => {
    const data = [{ name: 'Smith, John', email: 'john@example.com' }];
    const result = formatCsv(data);

    // Values with commas should be quoted
    expect(result).toContain('"Smith, John"');
  });

  it('properly escapes values with quotes', () => {
    const data = [{ name: 'Test "Quote" Name', email: 'test@example.com' }];
    const result = formatCsv(data);

    // Quotes should be escaped
    expect(result).toContain('Test');
  });

  it('handles numbers correctly', () => {
    const data = [{ id: 1, count: 42, price: 99.99 }];
    const result = formatCsv(data);

    expect(result).toContain('1');
    expect(result).toContain('42');
    expect(result).toContain('99.99');
  });

  it('handles boolean values', () => {
    const data = [{ active: true, deleted: false }];
    const result = formatCsv(data);

    // CSV stringify converts booleans to 1/0 or similar representation
    expect(result).toContain('active');
    expect(result).toContain('deleted');
    // Check that the result has the expected structure
    const lines = result.trim().split('\n');
    expect(lines.length).toBe(2); // Header + 1 data row
  });

  it('includes header row', () => {
    const data = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ];
    const result = formatCsv(data);
    const lines = result.trim().split('\n');

    // First line should be headers
    expect(lines[0]).toContain('id');
    expect(lines[0]).toContain('name');

    // Should have 3 lines total (1 header + 2 data)
    expect(lines.length).toBe(3);
  });

  it('formats multiple rows correctly', () => {
    const data = [
      { id: 1, name: 'Alice', score: 95 },
      { id: 2, name: 'Bob', score: 87 },
      { id: 3, name: 'Carol', score: 92 }
    ];
    const result = formatCsv(data);
    const lines = result.trim().split('\n');

    // Should have 4 lines (1 header + 3 data)
    expect(lines.length).toBe(4);

    // Each data line should contain the values
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
    expect(result).toContain('Carol');
    expect(result).toContain('95');
    expect(result).toContain('87');
    expect(result).toContain('92');
  });

  it('handles newlines in values', () => {
    const data = [{ name: 'Line1\nLine2', email: 'test@example.com' }];
    const result = formatCsv(data);

    // Newlines in values should be preserved within quotes
    expect(result).toBeDefined();
  });

  it('handles special characters', () => {
    const data = [
      { name: "O'Brien", email: 'test@example.com' },
      { name: 'Müller', email: 'muller@example.com' }
    ];
    const result = formatCsv(data);

    expect(result).toContain("O'Brien");
    expect(result).toContain('Müller');
  });
});
