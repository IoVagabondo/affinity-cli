import { z } from 'zod';

export const idSchema = z.union([z.string(), z.number()]).transform(String);

export const paginationSchema = z.object({
  page_size: z.number().optional(),
  page_token: z.string().optional(),
  next_page_token: z.string().nullable().optional()
});

export const affinityEntitySchema = z
  .object({
    id: idSchema,
    name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    domain: z.string().optional(),
    email_addresses: z.array(z.string()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
  })
  .passthrough();

export const fieldSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    value_type: z.union([z.string(), z.number()]).optional(),
    entity_type: z.union([z.string(), z.number()]).optional(),
    list_id: idSchema.optional().nullable()
  })
  .passthrough();

export const fieldValueSchema = z
  .object({
    id: idSchema,
    field_id: idSchema.optional().nullable(),
    value: z.any().optional(),
    person_id: idSchema.optional().nullable(),
    organization_id: idSchema.optional().nullable(),
    opportunity_id: idSchema.optional().nullable(),
    list_entry_id: idSchema.optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
  })
  .passthrough();

export const listSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    type: z.union([z.string(), z.number()]).optional(),
    public: z.boolean().optional(),
    owner_id: idSchema.optional(),
    creator_id: idSchema.optional(),
    list_size: z.number().optional(),
    entity_type: z.union([z.string(), z.number()]).optional(),
    is_private: z.boolean().optional(),
    fields: z.array(z.record(z.string(), z.unknown())).optional(),
    additional_permissions: z.array(z.record(z.string(), z.unknown())).optional()
  })
  .passthrough();

export const listEntrySchema = z
  .object({
    id: idSchema,
    list_id: idSchema.optional(),
    creator_id: idSchema.optional().nullable(),
    entity_id: idSchema.optional(),
    entity_type: z.union([z.string(), z.number()]).optional(),
    created_at: z.string().optional(),
    entity: z.record(z.string(), z.unknown()).optional()
  })
  .passthrough();

export const noteSchema = z.object({ id: idSchema }).passthrough();
export const reminderSchema = z.object({ id: idSchema }).passthrough();
export const interactionSchema = z.object({ id: idSchema }).passthrough();

export const pagedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z
    .object({
      records: z.array(itemSchema).optional(),
      results: z.array(itemSchema).optional(),
      data: z.array(itemSchema).optional(),
      next_page_token: z.string().nullable().optional()
    })
    .passthrough();

export const whoamiSchema = z
  .object({
    user_id: idSchema.optional(),
    email: z.string().optional()
  })
  .passthrough();

export const rateLimitSchema = z
  .object({
    minute_limit: z.number().optional(),
    minute_remaining: z.number().optional(),
    monthly_limit: z.number().optional(),
    monthly_remaining: z.number().optional()
  })
  .passthrough();

export type AffinityEntity = z.infer<typeof affinityEntitySchema>;
export type Field = z.infer<typeof fieldSchema>;
export type FieldValue = z.infer<typeof fieldValueSchema>;
export type List = z.infer<typeof listSchema>;
export type ListEntry = z.infer<typeof listEntrySchema>;
