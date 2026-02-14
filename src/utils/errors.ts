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
    const payload =
      includePayload && error.payload
        ? ` payload=${JSON.stringify(redactSensitive(error.payload))}`
        : '';
    return `${error.message}${payload}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
};
