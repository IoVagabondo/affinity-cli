import { z } from 'zod';
import { pickRecords } from './pagination';

export const parseRecords = <T>(payload: unknown, itemSchema: z.ZodType<T>): T[] => {
  const records = pickRecords<unknown>(payload);
  return z.array(itemSchema).parse(records);
};

export const nextPageTokenFromPayload = (payload: unknown): string | null | undefined => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }
  const token = (payload as Record<string, unknown>).next_page_token;
  return typeof token === 'string' || token === null ? token : undefined;
};
