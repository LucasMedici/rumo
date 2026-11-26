import type { JobDetail, JobSummary } from '@rumo/contracts'
import type { Prisma as PrismaTypes } from '../../generated/prisma/client.js'

export const MANUAL_SOURCE = 'manual'

/** What `findMany`/`findUnique` must include to build a summary. */
export const summaryInclude = {
  job: { include: { company: true } },
} satisfies PrismaTypes.UserJobInclude

/** What must be included to build a detail. */
export const detailInclude = {
  job: { include: { company: true, listings: { include: { source: true } } } },
} satisfies PrismaTypes.UserJobInclude

type UserJobWithSummary = PrismaTypes.UserJobGetPayload<{ include: typeof summaryInclude }>
type UserJobWithDetail = PrismaTypes.UserJobGetPayload<{ include: typeof detailInclude }>

export function toJobSummary({ job, createdAt }: UserJobWithSummary): JobSummary {
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
    addedAt: createdAt.toISOString(),
  }
}

export function toJobDetail(userJob: UserJobWithDetail, userId: string): JobDetail {
  const { job } = userJob
  return {
    ...toJobSummary(userJob),
    description: job.description,
    applyUrl: job.applyUrl,
    postedAt: job.postedAt?.toISOString() ?? null,
    firstSeenAt: job.firstSeenAt.toISOString(),
    sources: job.listings.map((listing) => ({
      key: listing.source.key,
      name: listing.source.name,
      url: listing.url,
    })),
    editable: isEditableBy(userJob, userId),
  }
}

/** Only jobs the user imported manually can be edited (sourced jobs are owned by their source). */
export function isEditableBy({ job }: UserJobWithDetail, userId: string): boolean {
  return job.listings.some(
    (listing) => listing.sourceKey === MANUAL_SOURCE && listing.importedByUserId === userId,
  )
}
