import { TFunction } from 'i18next';
import { z } from 'zod';

const K8S_NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const GO_DURATION_REGEX = /^(\d+h)?(\d+m)?(\d+s)?$/;

export const iarNameSchema = (t: TFunction) =>
  z
    .string()
    .min(1, t('Required'))
    .max(253, t('Must be 253 or fewer characters'))
    .regex(K8S_NAME_REGEX, t('Must be lowercase alphanumeric characters or hyphens'));

export const iarPrioritySchema = (t: TFunction) =>
  z
    .number({ invalid_type_error: t('Must be a number') })
    .int(t('Must be an integer'))
    .min(0, t('Must be 0 or greater'))
    .max(999, t('Must be 999 or less'));

export const iarWithinSchema = (t: TFunction) =>
  z
    .string()
    .min(1, t('Required'))
    .regex(GO_DURATION_REGEX, t('Must be a valid duration (e.g. 15m, 2h, 1h30m)'))
    .refine((val) => val !== '', { message: t('At least one duration component is required') });

const scopeFilterSchema = (t: TFunction) =>
  z
    .object({
      equals: z.string().optional(),
      in: z.array(z.string()).optional(),
      notIn: z.array(z.string()).optional(),
      regex: z.string().optional(),
      exists: z.boolean().optional(),
    })
    .refine(
      (filter) => {
        const defined = [
          filter.equals !== undefined,
          filter.in !== undefined,
          filter.notIn !== undefined,
          filter.regex !== undefined,
          filter.exists !== undefined,
        ].filter(Boolean);
        return defined.length === 1;
      },
      { message: t('Exactly one filter type must be set') },
    );

const baseMatchCriteriaSchema = (t: TFunction) =>
  z
    .object({
      exact: z.literal(true).optional(),
      allOf: z.array(z.string().min(1)).min(1).optional(),
      anyOf: z.array(z.string().min(1)).min(1).optional(),
      nOf: z
        .object({
          keys: z.array(z.string().min(1)).min(1),
          min: z.number().int().min(1),
        })
        .refine((val) => val.min <= val.keys.length, {
          message: t('min must be less than or equal to the number of keys'),
        })
        .optional(),
    })
    .refine(
      (match) => {
        const defined = [
          match.exact !== undefined,
          match.allOf !== undefined,
          match.anyOf !== undefined,
          match.nOf !== undefined,
        ].filter(Boolean);
        return defined.length <= 1;
      },
      { message: t('Exactly one match criterion type must be set') },
    );

export const matchCriteriaSchema = (t: TFunction): z.ZodType =>
  z.union([
    baseMatchCriteriaSchema(t),
    z.object({
      and: z.array(baseMatchCriteriaSchema(t)).min(2, t('At least 2 sub-criteria are required')),
    }),
    z.object({}),
  ]);

export const iarFormSchema = (t: TFunction) =>
  z.object({
    name: iarNameSchema(t),
    priority: iarPrioritySchema(t),
    within: iarWithinSchema(t),
    scope: z.record(z.string(), scopeFilterSchema(t)).optional(),
    match: matchCriteriaSchema(t),
    suppressBatchGrouping: z.boolean().optional(),
  });

export type IARFormValues = z.infer<ReturnType<typeof iarFormSchema>>;
