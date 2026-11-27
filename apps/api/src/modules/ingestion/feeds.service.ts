import {
  type CreateFeedInput,
  type Feed,
  type IngestionRun,
  ingestionStatsSchema,
  type UpdateFeedInput,
} from '@rumo/contracts'
import type { Prisma as PrismaTypes } from '../../generated/prisma/client.js'
import type { Prisma } from '../../infra/prisma.js'
import { AppError, ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js'
import type { SourceRegistry } from '../job-sources/core/registry.js'
import { isUniqueViolation } from '../jobs/jobs.service.js'
import { emptyStats, type IngestionRunner } from './ingestion-runner.js'

const feedInclude = {
  source: { select: { name: true } },
  runs: { orderBy: { startedAt: 'desc' }, take: 1 },
  _count: { select: { jobs: true } },
} satisfies PrismaTypes.SourceFeedInclude

type FeedRow = PrismaTypes.SourceFeedGetPayload<{ include: typeof feedInclude }>
type RunRow = PrismaTypes.IngestionRunGetPayload<object>

/** The source's limits don't allow a new run yet (e.g. Remotive: ~4 fetches a day). */
export class RunTooSoonError extends AppError {
  constructor(nextRunAt: Date) {
    super('This search was run recently. Try again later.', 429, 'RUN_TOO_SOON', {
      nextRunAt: nextRunAt.toISOString(),
    })
  }
}

/** Saved searches (feeds) of a user and their executions. Everything is scoped by `userId`. */
export class FeedsService {
  constructor(
    private readonly deps: {
      prisma: Prisma
      registry: SourceRegistry
      runner: Pick<IngestionRunner, 'execute'>
      now?: () => Date
    },
  ) {}

  private now() {
    return this.deps.now?.() ?? new Date()
  }

  async list(userId: string): Promise<Feed[]> {
    const feeds = await this.deps.prisma.sourceFeed.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: feedInclude,
    })
    return feeds.map((feed) => this.toFeed(feed))
  }

  async get(userId: string, feedId: string): Promise<Feed> {
    return this.toFeed(await this.findOwned(userId, feedId))
  }

  async create(userId: string, input: CreateFeedInput): Promise<Feed> {
    // Re-validated by the source itself: it is the authority on its config.
    const config = this.validateConfig(input.sourceKey, input.config)
    const feed = await this.deps.prisma.sourceFeed.create({
      data: {
        userId,
        sourceKey: input.sourceKey,
        name: input.name,
        enabled: input.enabled,
        config: config as object,
      },
      include: feedInclude,
    })
    return this.toFeed(feed)
  }

  async update(userId: string, feedId: string, input: UpdateFeedInput): Promise<Feed> {
    const current = await this.findOwned(userId, feedId)
    const config =
      input.config === undefined ? undefined : this.validateConfig(current.sourceKey, input.config)

    const feed = await this.deps.prisma.sourceFeed.update({
      where: { id: feedId },
      data: { name: input.name, enabled: input.enabled, config: config as object | undefined },
      include: feedInclude,
    })
    return this.toFeed(feed)
  }

  /** Deletes the feed and its runs; the jobs it found stay (they may be in the user's list). */
  async remove(userId: string, feedId: string): Promise<void> {
    await this.findOwned(userId, feedId)
    await this.deps.prisma.sourceFeed.delete({ where: { id: feedId } })
  }

  /**
   * Starts a run in the background and returns it immediately (status `running`).
   * Guards: feed enabled, source interval respected, one running run per feed (DB-enforced).
   */
  async startRun(userId: string, feedId: string): Promise<IngestionRun> {
    const { prisma, registry, runner } = this.deps
    const feed = await this.findOwned(userId, feedId)
    if (!feed.enabled) throw new ConflictError('This search is paused. Enable it to run.')

    const nextRunAt = this.nextRunAt(feed)
    if (nextRunAt) throw new RunTooSoonError(nextRunAt)
    registry.get(feed.sourceKey) // fails fast if the source is not available

    let run: RunRow
    try {
      run = await prisma.ingestionRun.create({ data: { feedId, stats: emptyStats() } })
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('This search is already running.')
      throw error
    }
    // Recorded at start: failed or repeated clicks still respect the source's limits.
    await prisma.sourceFeed.update({ where: { id: feedId }, data: { lastRunAt: this.now() } })

    void runner.execute(run.id, feed) // background; the run records its own outcome
    return toRun(run)
  }

  async listRuns(userId: string, feedId: string): Promise<IngestionRun[]> {
    await this.findOwned(userId, feedId)
    const runs = await this.deps.prisma.ingestionRun.findMany({
      where: { feedId },
      orderBy: { startedAt: 'desc' },
      take: 20,
    })
    return runs.map(toRun)
  }

  async getRun(userId: string, feedId: string, runId: string): Promise<IngestionRun> {
    await this.findOwned(userId, feedId)
    const run = await this.deps.prisma.ingestionRun.findFirst({ where: { id: runId, feedId } })
    if (!run) throw new NotFoundError('Run')
    return toRun(run)
  }

  private async findOwned(userId: string, feedId: string): Promise<FeedRow> {
    const feed = await this.deps.prisma.sourceFeed.findFirst({
      where: { id: feedId, userId },
      include: feedInclude,
    })
    if (!feed) throw new NotFoundError('Search')
    return feed
  }

  private validateConfig(sourceKey: string, config: unknown): unknown {
    const result = this.deps.registry.get(sourceKey).configSchema.safeParse(config)
    if (!result.success) {
      throw new ValidationError(
        'Invalid search settings',
        result.error.issues.map((issue) => ({
          path: `/config/${issue.path.join('/')}`,
          message: issue.message,
        })),
      )
    }
    return result.data
  }

  /** When the source allows the next run, or null if it can run now. */
  private nextRunAt(feed: Pick<FeedRow, 'sourceKey' | 'lastRunAt'>): Date | null {
    if (!feed.lastRunAt) return null
    const { minIntervalMs } = this.deps.registry.get(feed.sourceKey)
    const next = new Date(feed.lastRunAt.getTime() + minIntervalMs)
    return next > this.now() ? next : null
  }

  private toFeed(feed: FeedRow): Feed {
    const lastRun = feed.runs[0]
    return {
      id: feed.id,
      sourceKey: feed.sourceKey,
      sourceName: feed.source.name,
      name: feed.name,
      config: (feed.config ?? {}) as Record<string, unknown>,
      enabled: feed.enabled,
      lastRunAt: feed.lastRunAt?.toISOString() ?? null,
      nextRunAt: this.nextRunAt(feed)?.toISOString() ?? null,
      lastRun: lastRun ? toRun(lastRun) : null,
      jobCount: feed._count.jobs,
      createdAt: feed.createdAt.toISOString(),
    }
  }
}

function toRun(run: RunRow): IngestionRun {
  const stats = ingestionStatsSchema.safeParse(run.stats)
  return {
    id: run.id,
    feedId: run.feedId,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    stats: stats.success ? stats.data : emptyStats(),
    error: run.error,
  }
}
