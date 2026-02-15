import { AffinityApiError } from '../api/client';

const REDACTED_VALUE = '[REDACTED]';
const sensitiveKeyPatterns = [
  'token',
  'authorization',
  'api_key',
  'apikey',
  'password',
  'secret',
  'cookie',
  'set-cookie'
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isSensitiveKey = (key: string): boolean => {
  const normalized = key.toLowerCase();
  return sensitiveKeyPatterns.some((pattern) => normalized.includes(pattern));
};

const redactSensitive = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitive(entry, seen));
  }
  if (!isRecord(value)) return value;
  if (seen.has(value)) return '[Circular]';

  seen.add(value);
  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    output[key] = isSensitiveKey(key) ? REDACTED_VALUE : redactSensitive(nestedValue, seen);
  }
  return output;
};

export const toErrorMessage = (
  error: unknown,
  options?: {
    verbose?: boolean;
  }
): string => {
  if (error instanceof AffinityApiError) {
    const includePayload = Boolean(options?.verbose);

    // Build structured error message
    let message = `Error: ${error.message}`;

    // Add common resolution hints based on status code
    if (error.status === 401) {
      message += '\n  Hint: Check your API key with: affinity auth whoami';
    } else if (error.status === 403) {
      message += '\n  Hint: Your API key may not have permission for this operation';
    } else if (error.status === 404) {
      message += '\n  Hint: The requested resource was not found. Verify the ID is correct.';
    } else if (error.status === 429) {
      message += '\n  Hint: Rate limit exceeded. Check limits with: affinity auth rate-limit';
    } else if (error.status && error.status >= 500) {
      message += '\n  Hint: Affinity API server error. Try again in a moment.';
    }

    // Add verbose payload if requested
    const payload =
      includePayload && error.payload
        ? `\n  Payload: ${JSON.stringify(redactSensitive(error.payload), null, 2)}`
        : '';

    return `${message}${payload}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
};
