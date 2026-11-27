import { errorResponseSchema, type Feed, type IngestionRun } from '@rumo/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTestApp } from '../../../test/helpers.js'
import type { AuthIdentity, TokenVerifier } from '../../infra/auth/token-verifier.js'
import type { UsersService } from '../identity/users.service.js'
import { type FeedsService, RunTooSoonError } from './feeds.service.js'

const USER_ID = '7b0c5a1e-3f2d-4c8b-9a6e-1d2f3a4b5c6d'
const FEED_ID = '019abc12-0000-7000-8000-00000000feed'
const AUTH = { authorization: 'Bearer good-token' }
const identity: AuthIdentity = {
  userId: USER_ID,
  email: 'me@example.com',
  name: null,
  avatarUrl: null,
}
const verifier: TokenVerifier = { verify: async () => identity }

const feed: Feed = {
  id: FEED_ID,
  sourceKey: 'remotive',
  sourceName: 'Remotive',
  name: 'Node remoto',
  config: { search: 'node.js', maxResults: 100 },
  enabled: true,
  lastRunAt: null,
  nextRunAt: null,
  lastRun: null,
  jobCount: 0,
  createdAt: '2026-11-27T12:00:00.000Z',
}
const run: IngestionRun = {
  id: '019abc12-0000-7000-8000-0000000000aa',
  feedId: FEED_ID,
  status: 'running',
  startedAt: '2026-11-27T12:00:00.000Z',
  finishedAt: null,
  stats: { fetched: 0, created: 0, updated: 0, unchanged: 0, failed: 0 },
  error: null,
}

function setup() {
  const feedsService = {
    list: vi.fn(async () => [feed]),
    get: vi.fn(async () => feed),
    create: vi.fn(async () => feed),
    update: vi.fn(async () => feed),
    remove: vi.fn(async () => {}),
    startRun: vi.fn(async () => run),
    listRuns: vi.fn(async () => [run]),
    getRun: vi.fn(async () => run),
  }
  const usersService = { syncFromIdentity: vi.fn(async () => ({}) as never) }
  const app = buildTestApp({
    tokenVerifier: verifier,
    feedsService: feedsService as unknown as FeedsService,
    usersService: usersService as unknown as UsersService,
  })
  return { app, feedsService, usersService }
}

let ctx: ReturnType<typeof setup>
beforeEach(() => {
  ctx = setup()
})

describe('feeds routes', () => {
  it.each([
    ['GET', '/feeds'],
    ['POST', '/feeds'],
    ['PATCH', `/feeds/${FEED_ID}`],
    ['DELETE', `/feeds/${FEED_ID}`],
    ['POST', `/feeds/${FEED_ID}/runs`],
    ['GET', `/feeds/${FEED_ID}/runs`],
  ] as const)('%s %s requires a token', async (method, url) => {
    const response = await buildTestApp().inject({ method, url })
    expect(response.statusCode).toBe(401)
  })

  it('creates a feed (syncing the user first) and applies config defaults', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/feeds',
      headers: AUTH,
      payload: { sourceKey: 'remotive', name: 'Node remoto', config: { search: 'node.js' } },
    })

    expect(response.statusCode).toBe(201)
    expect(ctx.usersService.syncFromIdentity).toHaveBeenCalledWith(identity)
    expect(ctx.feedsService.create).toHaveBeenCalledWith(USER_ID, {
      sourceKey: 'remotive',
      name: 'Node remoto',
      enabled: true,
      config: { search: 'node.js', maxResults: 100 },
    })
  })

  it.each([
    ['unknown source', { sourceKey: 'linkedin', name: 'x y', config: {} }],
    ['no search and no category', { sourceKey: 'remotive', name: 'Node', config: {} }],
    [
      'too many results',
      { sourceKey: 'remotive', name: 'Node', config: { search: 'node', maxResults: 5000 } },
    ],
  ])('rejects %s with 400', async (_case, payload) => {
    const response = await ctx.app.inject({ method: 'POST', url: '/feeds', headers: AUTH, payload })

    expect(response.statusCode).toBe(400)
    expect(ctx.feedsService.create).not.toHaveBeenCalled()
  })

  it('starts a run with 202 Accepted', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: `/feeds/${FEED_ID}/runs`,
      headers: AUTH,
    })

    expect(response.statusCode).toBe(202)
    expect(response.json()).toMatchObject({ status: 'running', feedId: FEED_ID })
    expect(ctx.feedsService.startRun).toHaveBeenCalledWith(USER_ID, FEED_ID)
  })

  it('answers 429 RUN_TOO_SOON with the next allowed time', async () => {
    ctx.feedsService.startRun.mockRejectedValue(
      new RunTooSoonError(new Date('2026-11-27T18:00:00Z')),
    )

    const response = await ctx.app.inject({
      method: 'POST',
      url: `/feeds/${FEED_ID}/runs`,
      headers: AUTH,
    })

    expect(response.statusCode).toBe(429)
    expect(errorResponseSchema.parse(response.json()).error).toMatchObject({
      code: 'RUN_TOO_SOON',
      details: { nextRunAt: '2026-11-27T18:00:00.000Z' },
    })
  })

  it('deletes a feed with 204', async () => {
    const response = await ctx.app.inject({
      method: 'DELETE',
      url: `/feeds/${FEED_ID}`,
      headers: AUTH,
    })

    expect(response.statusCode).toBe(204)
    expect(ctx.feedsService.remove).toHaveBeenCalledWith(USER_ID, FEED_ID)
  })
})
