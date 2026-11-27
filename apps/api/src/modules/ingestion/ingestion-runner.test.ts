import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type { HttpClient } from '../../infra/http/http-client.js'
import type { Prisma } from '../../infra/prisma.js'
import type {
  JobSourceAdapter,
  NormalizedPosting,
  RawPosting,
} from '../job-sources/core/adapter.js'
import { createSourceRegistry } from '../job-sources/core/registry.js'
import { IngestionRunner } from './ingestion-runner.js'

const FEED = {
  id: '019abc12-0000-7000-8000-00000000feed',
  sourceKey: 'fake',
  config: { q: 'node' },
}
const RUN_ID = '019abc12-0000-7000-8000-000000000run'

function normalized(title: string, overrides: Partial<NormalizedPosting> = {}): NormalizedPosting {
  return {
    title,
    companyName: 'Acme',
    description: 'Build APIs with Node.js.',
    sourceUrl: 'https://example.com/jobs/1',
    applyUrl: 'https://example.com/jobs/1',
    locationText: 'Worldwide',
    countryCode: null,
    workMode: 'remote',
    seniority: null,
    employmentType: 'full_time',
    salary: null,
    postedAt: null,
    ...overrides,
  }
}

function fakeAdapter(postings: RawPosting[], options: { fetchError?: Error } = {}) {
  const adapter: JobSourceAdapter<{ q: string }> = {
    key: 'fake',
    configSchema: z.object({ q: z.string() }),
    minIntervalMs: 0,
    async *fetch() {
      if (options.fetchError) throw options.fetchError
      yield* postings
    },
    normalize: vi.fn((posting: RawPosting) => {
      const payload = posting.payload as { title?: string; broken?: boolean }
      if (payload.broken) throw new Error('unusable payload')
      return normalized(payload.title ?? 'Untitled')
    }),
  }
  return adapter
}

function setup(adapter: JobSourceAdapter, previousHashes: Record<string, string> = {}) {
  const prisma = {
    rawJobPosting: {
      findUnique: vi.fn(
        async ({ where }: { where: { sourceKey_externalId: { externalId: string } } }) => {
          const hash = previousHashes[where.sourceKey_externalId.externalId]
          return hash ? { payloadHash: hash } : null
        },
      ),
      upsert: vi.fn(async (_args: unknown) => ({})),
    },
    feedJob: { upsert: vi.fn(async (_args: unknown) => ({})) },
    ingestionRun: {
      update: vi.fn(async (_args: unknown) => ({})),
      updateMany: vi.fn(async (_args: unknown) => ({ count: 2 })),
    },
  }
  let nextJob = 0
  const jobs = {
    upsertFromSource: vi.fn(async () => ({
      jobId: `job-${++nextJob}`,
      outcome: 'created' as const,
    })),
    touchFromSource: vi.fn(async (): Promise<string | null> => 'job-existing'),
  }
  const http: HttpClient = { getJson: vi.fn() }
  const runner = new IngestionRunner({
    prisma: prisma as unknown as Prisma,
    registry: createSourceRegistry([adapter as JobSourceAdapter]),
    http,
    jobs,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  })
  const finishedRun = () =>
    prisma.ingestionRun.update.mock.calls.at(-1)?.[0] as unknown as {
      data: { status: string; stats: Record<string, number>; error: string | null }
    }
  return { runner, prisma, jobs, finishedRun }
}

const posting = (id: string, payload: object): RawPosting => ({ externalId: id, payload })

describe('IngestionRunner.execute', () => {
  let adapter: JobSourceAdapter

  beforeEach(() => {
    adapter = fakeAdapter([
      posting('1', { title: 'Backend Engineer' }),
      posting('2', { title: 'Node Developer' }),
    ])
  })

  it('stores raw payloads, upserts jobs and links them to the feed', async () => {
    const { runner, prisma, jobs, finishedRun } = setup(adapter)

    const stats = await runner.execute(RUN_ID, FEED)

    expect(stats).toEqual({ fetched: 2, created: 2, updated: 0, unchanged: 0, failed: 0 })
    expect(prisma.rawJobPosting.upsert).toHaveBeenCalledTimes(2)
    expect(jobs.upsertFromSource).toHaveBeenCalledWith(
      'fake',
      '1',
      expect.objectContaining({ title: 'Backend Engineer' }),
    )
    expect(prisma.feedJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { feedId: FEED.id, jobId: 'job-1' } }),
    )
    expect(finishedRun().data).toMatchObject({ status: 'succeeded', error: null })
  })

  it('skips normalization for unchanged payloads and only refreshes the job', async () => {
    // First run to learn the hashes the runner computes.
    const first = setup(adapter)
    await first.runner.execute(RUN_ID, FEED)
    const hashes = Object.fromEntries(
      first.prisma.rawJobPosting.upsert.mock.calls.map((call) => {
        const arg = (
          call as unknown as [{ create: { externalId: string; payloadHash: string } }]
        )[0]
        return [arg.create.externalId, arg.create.payloadHash]
      }),
    )

    const second = setup(adapter, hashes)
    const stats = await second.runner.execute(RUN_ID, FEED)

    expect(stats).toMatchObject({ fetched: 2, unchanged: 2, created: 0 })
    expect(second.jobs.touchFromSource).toHaveBeenCalledTimes(2)
    expect(second.jobs.upsertFromSource).not.toHaveBeenCalled()
    expect(adapter.normalize).toHaveBeenCalledTimes(2) // only in the first run
  })

  it('re-creates the job when the payload is unchanged but the job is missing', async () => {
    const first = setup(adapter)
    await first.runner.execute(RUN_ID, FEED)
    const hash = (
      first.prisma.rawJobPosting.upsert.mock.calls[0] as unknown as [
        { create: { payloadHash: string } },
      ]
    )[0].create.payloadHash

    const second = setup(fakeAdapter([posting('1', { title: 'Backend Engineer' })]), { '1': hash })
    second.jobs.touchFromSource.mockResolvedValue(null)
    const stats = await second.runner.execute(RUN_ID, FEED)

    expect(stats).toMatchObject({ created: 1, unchanged: 0 })
  })

  it('counts a broken posting as failed and keeps going', async () => {
    const mixed = fakeAdapter([
      posting('1', { title: 'Backend Engineer' }),
      posting('2', { broken: true }),
      posting('3', { title: 'Node Developer' }),
    ])
    const { runner, finishedRun } = setup(mixed)

    const stats = await runner.execute(RUN_ID, FEED)

    expect(stats).toMatchObject({ fetched: 3, created: 2, failed: 1 })
    expect(finishedRun().data.status).toBe('succeeded')
    expect(finishedRun().data.error).toContain('2: unusable payload')
  })

  it('rejects normalized data that breaks the job schema (e.g. javascript: links)', async () => {
    const evil = fakeAdapter([posting('1', { title: 'Backend Engineer' })])
    vi.mocked(evil.normalize).mockReturnValue(
      normalized('Backend Engineer', { sourceUrl: 'javascript:alert(1)' }),
    )
    const { runner, jobs, finishedRun } = setup(evil)

    const stats = await runner.execute(RUN_ID, FEED)

    expect(stats).toMatchObject({ failed: 1, created: 0 })
    expect(jobs.upsertFromSource).not.toHaveBeenCalled()
    expect(finishedRun().data).toMatchObject({ status: 'failed' }) // every item failed
    expect(finishedRun().data.error).toContain('sourceUrl')
  })

  it('marks the run as failed when the source request fails', async () => {
    const down = fakeAdapter([], { fetchError: new Error('HTTP 503') })
    const { runner, finishedRun } = setup(down)

    await runner.execute(RUN_ID, FEED)

    expect(finishedRun().data).toMatchObject({ status: 'failed', error: 'HTTP 503' })
  })

  it('marks the run as failed when the stored config is no longer valid', async () => {
    const { runner, finishedRun } = setup(adapter)

    await runner.execute(RUN_ID, { ...FEED, config: { unexpected: true } })

    expect(finishedRun().data.status).toBe('failed')
  })
})

describe('IngestionRunner.recoverInterruptedRuns', () => {
  it('marks runs left as running by a previous process as failed', async () => {
    const { runner, prisma } = setup(fakeAdapter([]))

    await expect(runner.recoverInterruptedRuns()).resolves.toBe(2)
    expect(prisma.ingestionRun.updateMany).toHaveBeenCalledWith({
      where: { status: 'running' },
      data: expect.objectContaining({
        status: 'failed',
        error: expect.stringContaining('Interrupted'),
      }),
    })
  })
})
