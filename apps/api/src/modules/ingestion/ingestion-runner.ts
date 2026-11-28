import { createHash } from 'node:crypto'
import type { IngestionStats } from '@rumo/contracts'
import type { HttpClient } from '../../infra/http/http-client.js'
import type { Prisma } from '../../infra/prisma.js'
import type { JobSourceAdapter, RawPosting } from '../job-sources/core/adapter.js'
import type { SourceRegistry } from '../job-sources/core/registry.js'
import { sourceJobSchema } from '../jobs/domain/source-job.js'
import type { JobsService } from '../jobs/jobs.service.js'

type Logger = Pick<Console, 'info' | 'warn' | 'error'>
type FeedToRun = { id: string; sourceKey: string; config: unknown }
type Outcome = 'created' | 'updated' | 'unchanged'

/** How many item errors are kept in the run's `error` summary. */
const MAX_ERRORS_IN_SUMMARY = 5

export const emptyStats = (): IngestionStats => ({
  fetched: 0,
  created: 0,
  updated: 0,
  unchanged: 0,
  failed: 0,
})

/**
 * Executes feeds: fetch postings from the source, keep the raw payload, normalize, validate and
 * upsert the job (via the jobs module), then link it to the feed. Each posting is independent:
 * one bad posting is counted as failed without stopping the run. Every step is idempotent.
 */
export class IngestionRunner {
  constructor(
    private readonly deps: {
      prisma: Prisma
      registry: SourceRegistry
      http: HttpClient
      jobs: Pick<JobsService, 'upsertFromSource' | 'touchFromSource'>
      logger?: Logger
    },
  ) {}

  private get logger(): Logger {
    return this.deps.logger ?? console
  }

  /** Runs a feed to completion and records the outcome in `runId`. Never throws. */
  async execute(runId: string, feed: FeedToRun): Promise<IngestionStats> {
    const { prisma, registry, http } = this.deps
    const stats = emptyStats()
    const itemErrors: string[] = []
    let fatal: string | null = null

    try {
      const adapter = registry.get(feed.sourceKey)
      const config = adapter.configSchema.parse(feed.config)

      for await (const posting of adapter.fetch(config, { http })) {
        stats.fetched++
        try {
          stats[await this.ingestPosting(feed.id, adapter, posting)]++
        } catch (error) {
          stats.failed++
          if (itemErrors.length < MAX_ERRORS_IN_SUMMARY) {
            itemErrors.push(`${posting.externalId || '(no id)'}: ${describe(error)}`)
          }
        }
      }
    } catch (error) {
      fatal = describe(error)
      this.logger.error({ err: error, feedId: feed.id, runId }, 'ingestion run failed')
    }

    const everythingFailed = stats.fetched > 0 && stats.failed === stats.fetched
    const status = fatal || everythingFailed ? 'failed' : 'succeeded'
    const error =
      fatal ?? (itemErrors.length > 0 ? `Failed items: ${itemErrors.join(' | ')}` : null)

    await prisma.ingestionRun.update({
      where: { id: runId },
      data: { status, finishedAt: new Date(), stats, error },
    })
    return stats
  }

  /**
   * Runs left as `running` by a previous process (crash/restart) will never finish: mark them as
   * failed so they don't block the feed (only one running run per feed is allowed).
   */
  async recoverInterruptedRuns(): Promise<number> {
    const { count } = await this.deps.prisma.ingestionRun.updateMany({
      where: { status: 'running' },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        error: 'Interrupted: the API restarted while this run was in progress',
      },
    })
    if (count > 0) this.logger.warn({ count }, 'marked interrupted ingestion runs as failed')
    return count
  }

  private async ingestPosting(
    feedId: string,
    adapter: JobSourceAdapter,
    posting: RawPosting,
  ): Promise<Outcome> {
    const { prisma, jobs } = this.deps
    if (!posting.externalId) throw new Error('posting without an id')

    const where = {
      sourceKey_externalId: { sourceKey: adapter.key, externalId: posting.externalId },
    }
    const payloadHash = hashPayload(adapter.normalizationVersion, posting.payload)
    const previous = await prisma.rawJobPosting.findUnique({ where, select: { payloadHash: true } })
    await prisma.rawJobPosting.upsert({
      where,
      create: {
        sourceKey: adapter.key,
        externalId: posting.externalId,
        payload: posting.payload as object,
        payloadHash,
      },
      update: { payload: posting.payload as object, payloadHash, lastFetchedAt: new Date() },
    })

    let jobId: string | null = null
    let outcome: Outcome = 'unchanged'

    // Same payload as last time: just mark the job as still published.
    if (previous?.payloadHash === payloadHash) {
      jobId = await jobs.touchFromSource(adapter.key, posting.externalId)
    }

    if (!jobId) {
      const normalized = sourceJobSchema.parse(adapter.normalize(posting))
      const result = await jobs.upsertFromSource(adapter.key, posting.externalId, normalized)
      jobId = result.jobId
      outcome = result.outcome
    }

    await prisma.feedJob.upsert({
      where: { feedId_jobId: { feedId, jobId } },
      create: { feedId, jobId },
      update: { lastSeenAt: new Date() },
    })
    return outcome
  }
}

/** Includes the normalization version: improving `normalize` re-processes existing postings. */
function hashPayload(normalizationVersion: number, payload: unknown): string {
  return createHash('sha256')
    .update(`v${normalizationVersion}:`)
    .update(JSON.stringify(payload))
    .digest('hex')
}

function describe(error: unknown): string {
  if (error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues)) {
    // Zod: "title: Too small; salary: ..." (short and useful in the run summary)
    return error.issues
      .slice(0, 3)
      .map(
        (issue: { path?: unknown[]; message?: string }) =>
          `${(issue.path ?? []).join('.') || 'payload'}: ${issue.message}`,
      )
      .join('; ')
  }
  return error instanceof Error ? error.message : String(error)
}
