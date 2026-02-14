import type { Field } from '../api/types';

export const resolveFieldByName = (fields: Field[], name: string): Field | undefined =>
  fields.find((field) => field.name.toLowerCase() === name.toLowerCase());
