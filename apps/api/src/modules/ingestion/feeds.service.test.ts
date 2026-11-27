import { remotiveConfigSchema } from '@rumo/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Prisma } from '../../infra/prisma.js'
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js'
import type { JobSourceAdapter } from '../job-sources/core/adapter.js'
import { createSourceRegistry } from '../job-sources/core/registry.js'
import { FeedsService, RunTooSoonError } from './feeds.service.js'

const USER_ID = '7b0c5a1e-3f2d-4c8b-9a6e-1d2f3a4b5c6d'
const FEED_ID = '019abc12-0000-7000-8000-00000000feed'
const NOW = new Date('2026-11-27T12:00:00Z')
const SIX_HOURS = 6 * 60 * 60 * 1000

const remotive: JobSourceAdapter = {
  key: 'remotive',
  configSchema: remotiveConfigSchema,
  minIntervalMs: SIX_HOURS,
  async *fetch() {},
  normalize: () => {
    throw new Error('not used')
  },
}

function feedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: FEED_ID,
    userId: USER_ID,
    sourceKey: 'remotive',
    name: 'Node remoto',
    config: { search: 'node.js', maxResults: 100 },
    enabled: true,
    lastRunAt: null as Date | null,
    createdAt: NOW,
    updatedAt: NOW,
    source: { name: 'Remotive' },
    runs: [],
    _count: { jobs: 0 },
    ...overrides,
  }
}

function setup() {
  const prisma = {
    sourceFeed: {
      findFirst: vi.fn(async () => feedRow() as ReturnType<typeof feedRow> | null),
      findMany: vi.fn(async () => [feedRow()]),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => feedRow(data)),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => feedRow(data)),
      delete: vi.fn(async () => ({})),
    },
    ingestionRun: {
      create: vi.fn(async () => ({
        id: '019abc12-0000-7000-8000-000000000run',
        feedId: FEED_ID,
        status: 'running',
        startedAt: NOW,
        finishedAt: null,
        stats: {},
        error: null,
      })),
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
    },
  }
  const runner = { execute: vi.fn(async () => ({}) as never) }
  const service = new FeedsService({
    prisma: prisma as unknown as Prisma,
    registry: createSourceRegistry([remotive]),
    runner,
    now: () => NOW,
  })
  return { service, prisma, runner }
}

let ctx: ReturnType<typeof setup>
beforeEach(() => {
  ctx = setup()
})

describe('FeedsService', () => {
  it('creates a feed with the config validated (and defaulted) by the source', async () => {
    const feed = await ctx.service.create(USER_ID, {
      sourceKey: 'remotive',
      name: 'Node remoto',
      enabled: true,
      config: { search: 'node.js', maxResults: 100 },
    })

    expect(ctx.prisma.sourceFeed.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: USER_ID, sourceKey: 'remotive' }),
      }),
    )
    expect(feed).toMatchObject({ sourceName: 'Remotive', nextRunAt: null, lastRun: null })
  })

  it('rejects an invalid config on update, with field details', async () => {
    const error = await ctx.service
      .update(USER_ID, FEED_ID, { config: { maxResults: 0 } })
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: expect.stringMatching(/^\/config\//) }),
      ]),
    )
    expect(ctx.prisma.sourceFeed.update).not.toHaveBeenCalled()
  })

  it('scopes every access by user (other users get 404)', async () => {
    ctx.prisma.sourceFeed.findFirst.mockResolvedValue(null)

    await expect(ctx.service.get(USER_ID, FEED_ID)).rejects.toBeInstanceOf(NotFoundError)
    await expect(ctx.service.startRun(USER_ID, FEED_ID)).rejects.toBeInstanceOf(NotFoundError)
    expect(ctx.prisma.sourceFeed.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: FEED_ID, userId: USER_ID } }),
    )
  })

  describe('startRun', () => {
    it('creates the run, records lastRunAt and executes in the background', async () => {
      const run = await ctx.service.startRun(USER_ID, FEED_ID)

      expect(run).toMatchObject({ status: 'running', feedId: FEED_ID })
      expect(ctx.prisma.sourceFeed.update).toHaveBeenCalledWith({
        where: { id: FEED_ID },
        data: { lastRunAt: NOW },
      })
      expect(ctx.runner.execute).toHaveBeenCalledWith(
        run.id,
        expect.objectContaining({ id: FEED_ID }),
      )
    })

    it('respects the source interval (Remotive: ~4 runs a day)', async () => {
      ctx.prisma.sourceFeed.findFirst.mockResolvedValue(
        feedRow({ lastRunAt: new Date(NOW.getTime() - 60 * 60 * 1000) }), // 1h ago
      )

      const error = await ctx.service.startRun(USER_ID, FEED_ID).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(RunTooSoonError)
      expect(error).toMatchObject({
        statusCode: 429,
        code: 'RUN_TOO_SOON',
        details: { nextRunAt: '2026-11-27T17:00:00.000Z' },
      })
      expect(ctx.prisma.ingestionRun.create).not.toHaveBeenCalled()
    })

    it('allows a new run once the interval has passed', async () => {
      ctx.prisma.sourceFeed.findFirst.mockResolvedValue(
        feedRow({ lastRunAt: new Date(NOW.getTime() - SIX_HOURS - 1) }),
      )

      await expect(ctx.service.startRun(USER_ID, FEED_ID)).resolves.toMatchObject({
        status: 'running',
      })
    })

    it('refuses a second concurrent run (unique index on running runs)', async () => {
      ctx.prisma.ingestionRun.create.mockRejectedValue(
        Object.assign(new Error('unique'), { code: 'P2002' }),
      )

      await expect(ctx.service.startRun(USER_ID, FEED_ID)).rejects.toBeInstanceOf(ConflictError)
      expect(ctx.runner.execute).not.toHaveBeenCalled()
    })

    it('refuses to run a paused feed', async () => {
      ctx.prisma.sourceFeed.findFirst.mockResolvedValue(feedRow({ enabled: false }))

      await expect(ctx.service.startRun(USER_ID, FEED_ID)).rejects.toBeInstanceOf(ConflictError)
    })
  })

  it('exposes nextRunAt while the source interval has not passed', async () => {
    ctx.prisma.sourceFeed.findFirst.mockResolvedValue(feedRow({ lastRunAt: NOW }))

    const feed = await ctx.service.get(USER_ID, FEED_ID)

    expect(feed.nextRunAt).toBe('2026-11-27T18:00:00.000Z')
  })
})
