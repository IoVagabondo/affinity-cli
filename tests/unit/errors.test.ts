import { describe, expect, it } from 'vitest';
import { AffinityApiError } from '../../src/api/client';
import { toErrorMessage } from '../../src/utils/errors';

describe('toErrorMessage', () => {
  it('does not include payload unless verbose', () => {
    const error = new AffinityApiError('Affinity API request failed (401)', 401, {
      message: 'Unauthorized',
      token: 'secret-token'
    });

    const message = toErrorMessage(error);
    expect(message).toContain('Error: Affinity API request failed (401)');
    expect(message).toContain('Hint: Check your API key');
    expect(message).not.toContain('Payload');
  });

  it('includes redacted payload in verbose mode', () => {
    const error = new AffinityApiError('Affinity API request failed (401)', 401, {
      message: 'Unauthorized',
      api_key: 'abc123',
      nested: {
        Authorization: 'Bearer xyz'
      }
    });

    const message = toErrorMessage(error, { verbose: true });
    expect(message).toContain('Error: Affinity API request failed (401)');
    expect(message).toContain('Hint: Check your API key');
    expect(message).toContain('Payload:');
    expect(message).toContain('"message": "Unauthorized"');
    expect(message).toContain('"api_key": "[REDACTED]"');
    expect(message).toContain('"Authorization": "[REDACTED]"');
  });

  it('includes helpful hints for 404 errors', () => {
    const error = new AffinityApiError('Resource not found', 404);
    const message = toErrorMessage(error);
    expect(message).toContain('Error: Resource not found');
    expect(message).toContain('Hint: The requested resource was not found');
  });

  it('includes helpful hints for 429 rate limit errors', () => {
    const error = new AffinityApiError('Rate limit exceeded', 429);
    const message = toErrorMessage(error);
    expect(message).toContain('Error: Rate limit exceeded');
    expect(message).toContain('Hint: Rate limit exceeded');
    expect(message).toContain('affinity auth rate-limit');
  });

  it('includes helpful hints for 500+ server errors', () => {
    const error = new AffinityApiError('Internal server error', 503);
    const message = toErrorMessage(error);
    expect(message).toContain('Error: Internal server error');
    expect(message).toContain('Hint: Affinity API server error');
  });
});
