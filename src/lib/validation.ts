import { z } from 'zod';
import { AppError } from './errors.js';

const enumValue = (values: readonly string[]) => z.preprocess(
  (value) => typeof value === 'string' ? value.toUpperCase() : value,
  z.enum(values as [string, ...string[]]),
);

const priceInput = z.union([
  z.string().regex(/^\d+$/, 'priceMinor must be a whole value'),
  z.number().int().safe().nonnegative(),
]).transform(String).refine((value) => BigInt(value) > 0n, 'priceMinor must be positive');

const residentialFields = {
  bedrooms: z.number().int().positive().max(100).nullable().optional(),
  bathrooms: z.number().int().positive().max(100).nullable().optional(),
};

export const propertyCreateSchema = z.object({
  agentId: z.string().uuid(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  propertyType: enumValue(['APARTMENT', 'DUPLEX', 'DETACHED_HOUSE', 'TERRACE', 'LAND']),
  listingType: enumValue(['SALE', 'RENT']),
  area: z.string().trim().min(1),
  priceMinor: priceInput,
  currency: z.literal('NGN'),
  ...residentialFields,
  status: enumValue(['AVAILABLE', 'UNDER_OFFER', 'SOLD', 'RENTED']),
}).strict();

export const propertyPatchSchema = propertyCreateSchema.omit({ agentId: true }).partial().strict();

export type PropertyInput = z.infer<typeof propertyCreateSchema>;

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const details = result.error.issues.reduce<Record<string, string[]>>((fields, issue) => {
    const key = issue.path.join('.') || 'body';
    (fields[key] ??= []).push(issue.message);
    return fields;
  }, {});
  throw new AppError(422, 'VALIDATION_ERROR', 'Request validation failed', { fields: details });
}

export function parseId(value: string | string[]): string {
  if (Array.isArray(value) || !z.string().uuid().safeParse(value).success) {
    throw new AppError(400, 'INVALID_ID', 'id must be a valid UUID');
  }
  return value;
}

export function validatePropertyRules(input: Partial<PropertyInput> & { propertyType: string; bedrooms?: number | null; bathrooms?: number | null }): void {
  if (input.propertyType === 'LAND') {
    if (input.bedrooms !== null || input.bathrooms !== null) {
      throw new AppError(422, 'VALIDATION_ERROR', 'LAND properties must have null bedrooms and bathrooms', {
        fields: { bedrooms: ['must be null for LAND'], bathrooms: ['must be null for LAND'] },
      });
    }
    return;
  }
  if (!Number.isInteger(input.bedrooms) || Number(input.bedrooms) < 1 || !Number.isInteger(input.bathrooms) || Number(input.bathrooms) < 1) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Residential properties require positive bedrooms and bathrooms', {
      fields: { bedrooms: ['must be a positive integer'], bathrooms: ['must be a positive integer'] },
    });
  }
}
