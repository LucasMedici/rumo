import { type RemotiveConfig, remotiveConfigSchema } from '@rumo/contracts'
import { z } from 'zod'
import { cleanCompanyDisplayName } from '../../../jobs/domain/company-name.js'
import { htmlToPlainText } from '../../../jobs/domain/html-to-text.js'
import { countryFromLocation } from '../../../jobs/domain/location.js'
import { parseSalaryText } from '../../../jobs/domain/salary.js'
import { inferSeniority } from '../../../jobs/domain/seniority.js'
import type { JobSourceAdapter, NormalizedPosting, RawPosting } from '../../core/adapter.js'

const ENDPOINT = 'https://remotive.com/api/remote-jobs'

/** Fields we rely on (the API returns more, e.g. tags and logos, kept in the raw payload). */
const remotiveJobSchema = z.object({
  id: z.number().int(),
  url: z.url(),
  title: z.string().trim().min(1),
  company_name: z.string().trim().min(1),
  job_type: z.string().nullish(),
  publication_date: z.string().nullish(),
  candidate_required_location: z.string().nullish(),
  salary: z.string().nullish(),
  description: z.string(),
})

const responseSchema = z.object({ jobs: z.array(z.unknown()) })

const EMPLOYMENT_TYPES: Record<string, NormalizedPosting['employmentType']> = {
  full_time: 'full_time',
  part_time: 'part_time',
  contract: 'contract',
  freelance: 'freelance',
  internship: 'internship',
}

/**
 * Remotive public API (remote jobs). Terms: link back to the posting on Remotive and credit
 * "Remotive" as the source; fetch at most ~4 times a day (more than 2 requests/minute is blocked);
 * postings are published with a 24h delay; never resubmit them to third-party job sites.
 */
export const remotiveAdapter: JobSourceAdapter<RemotiveConfig> = {
  key: 'remotive',
  configSchema: remotiveConfigSchema,
  // v2: salary only from the first sentence; "early career" → junior
  normalizationVersion: 2,
  minIntervalMs: 6 * 60 * 60 * 1000,

  async *fetch(config, { http }) {
    const url = new URL(ENDPOINT)
    if (config.search) url.searchParams.set('search', config.search)
    if (config.category) url.searchParams.set('category', config.category)

    // A single request returns every match (no pagination; `limit` is ignored by the API).
    const { jobs } = responseSchema.parse(await http.getJson(url))
    for (const job of jobs.slice(0, config.maxResults)) {
      const id = (job as { id?: unknown } | null)?.id
      yield { externalId: String(id ?? ''), payload: job }
    }
  },

  normalize(posting: RawPosting): NormalizedPosting {
    const job = remotiveJobSchema.parse(posting.payload)
    const location = job.candidate_required_location?.trim() || null

    return {
      title: job.title.replace(/\s+/g, ' '),
      companyName: cleanCompanyDisplayName(job.company_name),
      description: htmlToPlainText(job.description),
      sourceUrl: job.url,
      applyUrl: job.url, // applying happens on Remotive's page (also satisfies the link-back term)
      locationText: location,
      countryCode: countryFromLocation(location),
      workMode: 'remote', // Remotive only lists remote jobs
      seniority: inferSeniority(job.title),
      employmentType: EMPLOYMENT_TYPES[job.job_type ?? ''] ?? null,
      salary: parseSalaryText(job.salary),
      postedAt: parseRemotiveDate(job.publication_date),
    }
  },
}

/** "2026-11-24T10:31:32" (no timezone) → treated as UTC. */
function parseRemotiveDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}
