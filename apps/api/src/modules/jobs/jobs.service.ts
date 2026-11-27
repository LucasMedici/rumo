import {
  type ImportJobInput,
  type JobDetail,
  type JobListResponse,
  type ListJobsQuery,
  salaryStateSchema,
  type UpdateJobInput,
} from '@rumo/contracts'
import type { Prisma } from '../../infra/prisma.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors.js'
import { cleanCompanyDisplayName, normalizeCompanyName } from './domain/company-name.js'
import type { SourceJob } from './domain/source-job.js'
import {
  detailInclude,
  isEditableBy,
  MANUAL_SOURCE,
  summaryInclude,
  toJobDetail,
  toJobSummary,
} from './jobs.mapper.js'

type Tx = Parameters<Parameters<Prisma['$transaction']>[0]>[0]

export class JobsService {
  constructor(private readonly prisma: Prisma) {}

  /**
   * Manual import: creates the job (always a new one for now; cross-source deduplication comes
   * later), records the manual listing and adds it to the user's list, atomically.
   */
  async importManual(userId: string, input: ImportJobInput): Promise<JobDetail> {
    const jobId = await this.prisma.$transaction(async (tx) => {
      const companyId = await upsertCompany(tx, input.companyName)
      const job = await tx.job.create({
        data: { companyId, ...toCreateData(input) },
      })
      await tx.jobListing.create({
        data: {
          jobId: job.id,
          sourceKey: MANUAL_SOURCE,
          externalId: job.id,
          url: input.applyUrl ?? null,
          importedByUserId: userId,
        },
      })
      await tx.userJob.create({ data: { userId, jobId: job.id, origin: 'imported' } })
      return job.id
    })

    return this.getForUser(userId, jobId)
  }

  /** The user's jobs, newest first, with cursor pagination. */
  async listForUser(userId: string, { limit, cursor }: ListJobsQuery): Promise<JobListResponse> {
    const rows = await this.prisma.userJob.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { jobId: 'desc' }],
      take: limit + 1,
      ...(cursor && { cursor: { userId_jobId: { userId, jobId: cursor } }, skip: 1 }),
      include: summaryInclude,
    })

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    return {
      items: page.map(toJobSummary),
      nextCursor: hasMore ? (page.at(-1)?.jobId ?? null) : null,
    }
  }

  /** A job from the user's list. Jobs outside the list are reported as not found. */
  async getForUser(userId: string, jobId: string): Promise<JobDetail> {
    return toJobDetail(await this.findUserJob(userId, jobId), userId)
  }

  /** Edits a manually imported job. `null` clears an optional field. */
  async updateManual(userId: string, jobId: string, input: UpdateJobInput): Promise<JobDetail> {
    const userJob = await this.findUserJob(userId, jobId)
    if (!isEditableBy(userJob, userId)) {
      throw new ForbiddenError('Only jobs you imported manually can be edited')
    }

    const { companyName, ...changes } = input
    const current = userJob.job
    const salary = salaryStateSchema.safeParse({
      salaryMin: changes.salaryMin !== undefined ? changes.salaryMin : current.salaryMin,
      salaryMax: changes.salaryMax !== undefined ? changes.salaryMax : current.salaryMax,
      salaryCurrency:
        changes.salaryCurrency !== undefined ? changes.salaryCurrency : current.salaryCurrency,
      salaryPeriod:
        changes.salaryPeriod !== undefined ? changes.salaryPeriod : current.salaryPeriod,
    })
    if (!salary.success) {
      throw new ValidationError(
        'Invalid salary',
        salary.error.issues.map((issue) => ({
          path: `/${issue.path.join('/')}`,
          message: issue.message,
        })),
      )
    }

    await this.prisma.$transaction(async (tx) => {
      const companyId = companyName ? await upsertCompany(tx, companyName) : undefined
      // Prisma ignores `undefined`, so only the fields present in the input are updated.
      await tx.job.update({ where: { id: jobId }, data: { ...changes, companyId } })
      if (changes.applyUrl !== undefined) {
        await tx.jobListing.updateMany({
          where: { jobId, sourceKey: MANUAL_SOURCE, importedByUserId: userId },
          data: { url: changes.applyUrl },
        })
      }
    })

    return this.getForUser(userId, jobId)
  }

  /** Removes the job from the user's list (the global job is kept for other sources/history). */
  async removeFromUser(userId: string, jobId: string): Promise<void> {
    const { count } = await this.prisma.userJob.deleteMany({ where: { userId, jobId } })
    if (count === 0) throw new NotFoundError('Job')
  }

  /**
   * Creates or updates the job behind a source posting, identified by (source, externalId).
   * The input must already be validated with `sourceJobSchema`. A posting seen again also
   * re-opens the job and refreshes `lastSeenAt`.
   */
  async upsertFromSource(
    sourceKey: string,
    externalId: string,
    input: SourceJob,
  ): Promise<{ jobId: string; outcome: 'created' | 'updated' }> {
    const now = new Date()
    const existing = await this.prisma.jobListing.findUnique({
      where: { sourceKey_externalId: { sourceKey, externalId } },
      select: { jobId: true },
    })

    if (existing) {
      await this.prisma.$transaction(async (tx) => {
        const companyId = await upsertCompany(tx, input.companyName)
        await tx.job.update({
          where: { id: existing.jobId },
          data: {
            ...toSourceJobData(input),
            companyId,
            lastSeenAt: now,
            status: 'open',
            closedAt: null,
          },
        })
        await tx.jobListing.update({
          where: { sourceKey_externalId: { sourceKey, externalId } },
          data: { url: input.sourceUrl, lastSeenAt: now },
        })
      })
      return { jobId: existing.jobId, outcome: 'updated' }
    }

    try {
      const jobId = await this.prisma.$transaction(async (tx) => {
        const companyId = await upsertCompany(tx, input.companyName)
        const job = await tx.job.create({
          data: { ...toSourceJobData(input), companyId, firstSeenAt: now, lastSeenAt: now },
        })
        await tx.jobListing.create({
          data: { jobId: job.id, sourceKey, externalId, url: input.sourceUrl },
        })
        return job.id
      })
      return { jobId, outcome: 'created' }
    } catch (error) {
      // Another run created the same posting concurrently: fall back to an update.
      if (isUniqueViolation(error)) return this.upsertFromSource(sourceKey, externalId, input)
      throw error
    }
  }

  /**
   * Marks a posting (and its job) as still published, without touching its content.
   * Returns the job id, or null when the posting was never turned into a job.
   */
  async touchFromSource(sourceKey: string, externalId: string): Promise<string | null> {
    const listing = await this.prisma.jobListing.findUnique({
      where: { sourceKey_externalId: { sourceKey, externalId } },
      select: { jobId: true },
    })
    if (!listing) return null

    const now = new Date()
    await this.prisma.$transaction([
      this.prisma.jobListing.update({
        where: { sourceKey_externalId: { sourceKey, externalId } },
        data: { lastSeenAt: now },
      }),
      this.prisma.job.update({
        where: { id: listing.jobId },
        data: { lastSeenAt: now, status: 'open', closedAt: null },
      }),
    ])
    return listing.jobId
  }

  private async findUserJob(userId: string, jobId: string) {
    const userJob = await this.prisma.userJob.findUnique({
      where: { userId_jobId: { userId, jobId } },
      include: detailInclude,
    })
    if (!userJob) throw new NotFoundError('Job')
    return userJob
  }
}

async function upsertCompany(tx: Tx, rawName: string): Promise<string> {
  const name = cleanCompanyDisplayName(rawName)
  const company = await tx.company.upsert({
    where: { normalizedName: normalizeCompanyName(name) },
    create: { name, normalizedName: normalizeCompanyName(name) },
    update: {},
    select: { id: true },
  })
  return company.id
}

/** Maps the import input to the `jobs` columns (absent optional fields become `null`). */
function toCreateData(input: ImportJobInput) {
  return {
    title: input.title,
    description: input.description,
    applyUrl: input.applyUrl ?? null,
    locationText: input.locationText ?? null,
    countryCode: input.countryCode ?? null,
    workMode: input.workMode ?? null,
    seniority: input.seniority ?? null,
    employmentType: input.employmentType ?? null,
    salaryMin: input.salaryMin ?? null,
    salaryMax: input.salaryMax ?? null,
    salaryCurrency: input.salaryCurrency ?? null,
    salaryPeriod: input.salaryPeriod ?? null,
  }
}

/** Maps a validated source posting to the `jobs` columns. */
function toSourceJobData(input: SourceJob) {
  return {
    title: input.title,
    description: input.description,
    applyUrl: input.applyUrl,
    locationText: input.locationText,
    countryCode: input.countryCode,
    workMode: input.workMode,
    seniority: input.seniority,
    employmentType: input.employmentType,
    salaryMin: input.salary?.min ?? null,
    salaryMax: input.salary?.max ?? null,
    salaryCurrency: input.salary?.currency ?? null,
    salaryPeriod: input.salary?.period ?? null,
    postedAt: input.postedAt,
  }
}

/** Prisma's unique constraint violation (P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 'P2002'
}
