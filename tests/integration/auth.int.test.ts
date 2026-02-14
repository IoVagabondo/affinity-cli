import { describe, expect, it } from 'vitest';
import { getClients, hasKey } from './helpers';

describe.runIf(hasKey())('integration: auth', () => {
  it('whoami succeeds', async () => {
    const payload = await getClients().auth.whoami();
    expect(payload).toBeTruthy();
  });

  it('rate limit endpoint succeeds', async () => {
    const payload = await getClients().auth.rateLimit();
    expect(payload).toBeTruthy();
  });
});

describe.skipIf(hasKey())('integration: auth (missing key)', () => {
  it('requires AFFINITY_API_KEY', () => {
    expect(hasKey()).toBe(false);
  });
});
