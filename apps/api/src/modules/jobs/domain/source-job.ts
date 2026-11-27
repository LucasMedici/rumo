import {
  employmentTypeSchema,
  salaryPeriodSchema,
  senioritySchema,
  workModeSchema,
} from '@rumo/contracts'
import { z } from 'zod'

const httpUrl = z.url({ protocol: /^https?$/, hostname: z.regexes.domain }).max(2_000)

/**
 * A job as delivered by a source adapter, already in Rumo's format. Validated before it touches
 * the database, so a broken payload fails that single posting instead of the whole run.
 */
export const sourceJobSchema = z.object({
  title: z.string().trim().min(2).max(300),
  companyName: z.string().trim().min(1).max(200),
  /** Plain text (adapters convert HTML). */
  description: z.string().trim().min(1).max(200_000),
  sourceUrl: httpUrl,
  applyUrl: httpUrl.nullable(),
  locationText: z.string().trim().max(300).nullable(),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable(),
  workMode: workModeSchema.nullable(),
  seniority: senioritySchema.nullable(),
  employmentType: employmentTypeSchema.nullable(),
  salary: z
    .object({
      min: z.number().int().nonnegative().nullable(),
      max: z.number().int().nonnegative().nullable(),
      currency: z.string().regex(/^[A-Z]{3}$/),
      period: salaryPeriodSchema,
    })
    .refine((s) => s.min === null || s.max === null || s.min <= s.max, {
      message: 'salary min must be <= max',
    })
    .nullable(),
  postedAt: z.date().nullable(),
})

export type SourceJob = z.infer<typeof sourceJobSchema>
