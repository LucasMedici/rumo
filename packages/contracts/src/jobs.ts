import { z } from 'zod'

// ─── Enumerations (labels for the UI live in the web app) ────────────────────────────────

export const workModes = ['remote', 'hybrid', 'onsite'] as const
export const seniorities = [
  'intern',
  'junior',
  'mid',
  'senior',
  'staff',
  'principal',
  'lead',
  'manager',
] as const
export const employmentTypes = [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'temporary',
  'freelance',
] as const
export const salaryPeriods = ['hour', 'day', 'month', 'year'] as const
export const jobStatuses = ['open', 'closed'] as const

export const workModeSchema = z.enum(workModes)
export const senioritySchema = z.enum(seniorities)
export const employmentTypeSchema = z.enum(employmentTypes)
export const salaryPeriodSchema = z.enum(salaryPeriods)
export const jobStatusSchema = z.enum(jobStatuses)

export type WorkMode = z.infer<typeof workModeSchema>
export type Seniority = z.infer<typeof senioritySchema>
export type EmploymentType = z.infer<typeof employmentTypeSchema>
export type SalaryPeriod = z.infer<typeof salaryPeriodSchema>

// ─── Input: manual import / edit ─────────────────────────────────────────────────────────

/** Only http(s) links: blocks `javascript:` and similar URLs that would become XSS in a link. */
const httpUrl = z.url({ protocol: /^https?$/, hostname: z.regexes.domain })

const salaryAmount = z.number().int().nonnegative().max(100_000_000)

const jobFieldsSchema = z.object({
  title: z.string().trim().min(2).max(200),
  companyName: z.string().trim().min(1).max(200),
  description: z.string().trim().min(20).max(50_000),
  applyUrl: httpUrl.max(2_000).nullish(),
  locationText: z.string().trim().max(200).nullish(),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .nullish(),
  workMode: workModeSchema.nullish(),
  seniority: senioritySchema.nullish(),
  employmentType: employmentTypeSchema.nullish(),
  salaryMin: salaryAmount.nullish(),
  salaryMax: salaryAmount.nullish(),
  salaryCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .nullish(),
  salaryPeriod: salaryPeriodSchema.nullish(),
})

type SalaryFields = Partial<
  Pick<
    z.infer<typeof jobFieldsSchema>,
    'salaryMin' | 'salaryMax' | 'salaryCurrency' | 'salaryPeriod'
  >
>

/** Salary rules shared by import and edit. */
function checkSalary(data: SalaryFields, ctx: z.RefinementCtx) {
  const hasAmount = data.salaryMin != null || data.salaryMax != null
  if (data.salaryMin != null && data.salaryMax != null && data.salaryMin > data.salaryMax) {
    ctx.addIssue({
      code: 'custom',
      path: ['salaryMax'],
      message: 'salaryMax must be greater than or equal to salaryMin',
    })
  }
  if (hasAmount && !data.salaryCurrency) {
    ctx.addIssue({ code: 'custom', path: ['salaryCurrency'], message: 'currency is required' })
  }
  if (hasAmount && !data.salaryPeriod) {
    ctx.addIssue({ code: 'custom', path: ['salaryPeriod'], message: 'period is required' })
  }
}

/** POST /jobs/import */
export const importJobSchema = jobFieldsSchema.superRefine(checkSalary)
export type ImportJobInput = z.infer<typeof importJobSchema>

/** PATCH /jobs/:id — partial; `null` clears an optional field. */
export const updateJobSchema = jobFieldsSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' })
export type UpdateJobInput = z.infer<typeof updateJobSchema>

/** Validates the salary of the job as it will be after an update (merged with the stored values). */
export const salaryStateSchema = z
  .object({
    salaryMin: salaryAmount.nullable(),
    salaryMax: salaryAmount.nullable(),
    salaryCurrency: z.string().nullable(),
    salaryPeriod: salaryPeriodSchema.nullable(),
  })
  .superRefine(checkSalary)

// ─── Output ──────────────────────────────────────────────────────────────────────────────

export const companySchema = z.object({ id: z.uuid(), name: z.string() })

export const salarySchema = z.object({
  min: z.number().int().nullable(),
  max: z.number().int().nullable(),
  currency: z.string().length(3),
  period: salaryPeriodSchema,
})

/** A job as shown in lists. */
export const jobSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  company: companySchema,
  locationText: z.string().nullable(),
  countryCode: z.string().nullable(),
  workMode: workModeSchema.nullable(),
  seniority: senioritySchema.nullable(),
  employmentType: employmentTypeSchema.nullable(),
  salary: salarySchema.nullable(),
  status: jobStatusSchema,
  /** In the user's list ("Minhas vagas": saved or imported). */
  inList: z.boolean(),
  /** When the job entered the user's list; null when it is not in the list. */
  addedAt: z.iso.datetime().nullable(),
  /** When the user's saved searches first found it; null for jobs only imported manually. */
  foundAt: z.iso.datetime().nullable(),
  /** Where the job comes from (attribution: "via Remotive"). */
  sources: z.array(z.object({ key: z.string(), name: z.string(), url: z.string().nullable() })),
})
export type JobSummary = z.infer<typeof jobSummarySchema>

/** A job with every detail (GET /jobs/:id). */
export const jobDetailSchema = jobSummarySchema.extend({
  description: z.string(),
  applyUrl: z.string().nullable(),
  postedAt: z.iso.datetime().nullable(),
  firstSeenAt: z.iso.datetime(),
  /** Manually imported by the current user, so it can be edited. */
  editable: z.boolean(),
})
export type JobDetail = z.infer<typeof jobDetailSchema>

// ─── Listing / pagination ────────────────────────────────────────────────────────────────

export const listJobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  /** `nextCursor` from the previous page. */
  cursor: z.uuid().optional(),
})
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>

export const jobListResponseSchema = z.object({
  items: z.array(jobSummarySchema),
  /** Pass as `cursor` to fetch the next page; null when there are no more items. */
  nextCursor: z.string().nullable(),
})
export type JobListResponse = z.infer<typeof jobListResponseSchema>

export const jobIdParamsSchema = z.object({ id: z.uuid() })
