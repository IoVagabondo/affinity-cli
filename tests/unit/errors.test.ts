import { describe, expect, it } from 'vitest';
import { AffinityApiError } from '../../src/api/client';
import { toErrorMessage } from '../../src/utils/errors';

describe('toErrorMessage', () => {
  it('does not include payload unless verbose', () => {
    const error = new AffinityApiError('Affinity API request failed (401)', 401, {
      message: 'Unauthorized',
      token: 'secret-token'
    });

    expect(toErrorMessage(error)).toBe('Affinity API request failed (401)');
  });

  it('includes redacted payload in verbose mode', () => {
    const error = new AffinityApiError('Affinity API request failed (401)', 401, {
      message: 'Unauthorized',
      api_key: 'abc123',
      nested: {
        Authorization: 'Bearer xyz'
      }
    });

    expect(toErrorMessage(error, { verbose: true })).toBe(
      'Affinity API request failed (401) payload={"message":"Unauthorized","api_key":"[REDACTED]","nested":{"Authorization":"[REDACTED]"}}'
    );
  });
});
