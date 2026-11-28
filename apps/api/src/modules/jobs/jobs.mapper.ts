import type { JobDetail, JobSummary } from '@rumo/contracts'
import type { Prisma as PrismaTypes } from '../../generated/prisma/client.js'

export const MANUAL_SOURCE = 'manual'

/**
 * What to load for a job as seen by one user: company, sources (attribution), the user's list
 * entry (if any) and when the user's saved searches first found it (if ever).
 */
export function jobInclude(userId: string) {
  return {
    company: true,
    listings: { include: { source: true }, orderBy: { firstSeenAt: 'asc' } },
    users: { where: { userId }, select: { createdAt: true } },
    feeds: {
      where: { feed: { userId } },
      select: { firstSeenAt: true },
      orderBy: { firstSeenAt: 'asc' },
      take: 1,
    },
  } satisfies PrismaTypes.JobInclude
}

export type JobRow = PrismaTypes.JobGetPayload<{ include: ReturnType<typeof jobInclude> }>

/** Jobs a user can see: in their list, or found by one of their saved searches. */
export function accessibleBy(userId: string) {
  return {
    OR: [{ users: { some: { userId } } }, { feeds: { some: { feed: { userId } } } }],
  } satisfies PrismaTypes.JobWhereInput
}

export function toJobSummary(job: JobRow): JobSummary {
  const listEntry = job.users[0]
  return {
    id: job.id,
    title: job.title,
    company: { id: job.company.id, name: job.company.name },
    locationText: job.locationText,
    countryCode: job.countryCode,
    workMode: job.workMode,
    seniority: job.seniority,
    employmentType: job.employmentType,
    salary:
      job.salaryCurrency && job.salaryPeriod && (job.salaryMin != null || job.salaryMax != null)
        ? {
            min: job.salaryMin,
            max: job.salaryMax,
            currency: job.salaryCurrency,
            period: job.salaryPeriod,
          }
        : null,
    status: job.status,
    inList: Boolean(listEntry),
    addedAt: listEntry?.createdAt.toISOString() ?? null,
    foundAt: job.feeds[0]?.firstSeenAt.toISOString() ?? null,
    sources: job.listings.map((listing) => ({
      key: listing.source.key,
      name: listing.source.name,
      url: listing.url,
    })),
  }
}

export function toJobDetail(job: JobRow, userId: string): JobDetail {
  return {
    ...toJobSummary(job),
    description: job.description,
    applyUrl: job.applyUrl,
    postedAt: job.postedAt?.toISOString() ?? null,
    firstSeenAt: job.firstSeenAt.toISOString(),
    editable: isEditableBy(job, userId),
  }
}

/** Only jobs the user imported manually can be edited (sourced jobs are owned by their source). */
export function isEditableBy(job: Pick<JobRow, 'listings'>, userId: string): boolean {
  return job.listings.some(
    (listing) => listing.sourceKey === MANUAL_SOURCE && listing.importedByUserId === userId,
  )
}
