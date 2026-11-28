import { errorResponseSchema, type JobDetail, jobDetailSchema } from '@rumo/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTestApp } from '../../../test/helpers.js'
import type { AuthIdentity, TokenVerifier } from '../../infra/auth/token-verifier.js'
import { ForbiddenError, NotFoundError } from '../../shared/errors.js'
import type { UsersService } from '../identity/users.service.js'
import type { JobsService } from './jobs.service.js'

const USER_ID = '7b0c5a1e-3f2d-4c8b-9a6e-1d2f3a4b5c6d'
const JOB_ID = '019abc12-3456-7def-8123-456789abcdef'
const AUTH = { authorization: 'Bearer good-token' }

const identity: AuthIdentity = {
  userId: USER_ID,
  email: 'me@example.com',
  name: null,
  avatarUrl: null,
}
const verifier: TokenVerifier = { verify: async () => identity }

const detail: JobDetail = {
  id: JOB_ID,
  title: 'Senior Backend Engineer',
  company: { id: '019abc12-0000-7def-8123-456789abcdef', name: 'Acme' },
  locationText: 'Remote',
  countryCode: 'US',
  workMode: 'remote',
  seniority: 'senior',
  employmentType: 'full_time',
  salary: { min: 120000, max: 150000, currency: 'USD', period: 'year' },
  status: 'open',
  inList: true,
  addedAt: '2026-11-25T00:00:00.000Z',
  foundAt: null,
  description: 'Build and scale our Node.js APIs.',
  applyUrl: 'https://boards.greenhouse.io/acme/jobs/1',
  postedAt: null,
  firstSeenAt: '2026-11-25T00:00:00.000Z',
  sources: [{ key: 'manual', name: 'Manual import', url: null }],
  editable: true,
}

const validImport = {
  title: 'Senior Backend Engineer',
  companyName: 'Acme',
  description: 'Build and scale our Node.js APIs with Fastify and Postgres.',
  applyUrl: 'https://boards.greenhouse.io/acme/jobs/1',
  countryCode: 'us',
  workMode: 'remote',
  salaryMin: 120000,
  salaryMax: 150000,
  salaryCurrency: 'usd',
  salaryPeriod: 'year',
}

function setup() {
  const jobsService = {
    importManual: vi.fn().mockResolvedValue(detail),
    listForUser: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    discoverForUser: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    saveForUser: vi.fn().mockResolvedValue(detail),
    getForUser: vi.fn().mockResolvedValue(detail),
    updateManual: vi.fn().mockResolvedValue(detail),
    removeFromUser: vi.fn().mockResolvedValue(undefined),
  }
  const usersService = { syncFromIdentity: vi.fn().mockResolvedValue(undefined) }
  const app = buildTestApp({
    tokenVerifier: verifier,
    jobsService: jobsService as unknown as JobsService,
    usersService: usersService as unknown as UsersService,
  })
  return { app, jobsService, usersService }
}

let ctx: ReturnType<typeof setup>
beforeEach(() => {
  ctx = setup()
})

describe('jobs routes: authentication', () => {
  it.each([
    ['POST', '/jobs/import'],
    ['GET', '/jobs'],
    ['GET', `/jobs/${JOB_ID}`],
    ['PATCH', `/jobs/${JOB_ID}`],
    ['DELETE', `/jobs/${JOB_ID}`],
    ['GET', '/discover'],
    ['POST', `/jobs/${JOB_ID}/save`],
  ] as const)('%s %s requires a token', async (method, url) => {
    const response = await buildTestApp().inject({ method, url })
    expect(response.statusCode).toBe(401)
  })
})

describe('POST /jobs/import', () => {
  it('syncs the user, imports with normalized input and returns 201', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/jobs/import',
      headers: AUTH,
      payload: validImport,
    })

    expect(response.statusCode).toBe(201)
    expect(jobDetailSchema.parse(response.json()).id).toBe(JOB_ID)
    expect(ctx.usersService.syncFromIdentity).toHaveBeenCalledWith(identity)
    expect(ctx.jobsService.importManual).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ countryCode: 'US', salaryCurrency: 'USD' }),
    )
  })

  it.each([
    ['missing title', { ...validImport, title: undefined }, '/title'],
    ['description too short', { ...validImport, description: 'short' }, '/description'],
    ['javascript: link (XSS)', { ...validImport, applyUrl: 'javascript:alert(1)' }, '/applyUrl'],
    ['unknown work mode', { ...validImport, workMode: 'beach' }, '/workMode'],
    ['salary without currency', { ...validImport, salaryCurrency: undefined }, '/salaryCurrency'],
    ['inverted salary range', { ...validImport, salaryMin: 200000 }, '/salaryMax'],
    ['negative salary', { ...validImport, salaryMin: -1 }, '/salaryMin'],
  ])('rejects %s with 400', async (_case, payload, path) => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/jobs/import',
      headers: AUTH,
      payload,
    })

    expect(response.statusCode).toBe(400)
    const { error } = errorResponseSchema.parse(response.json())
    expect(error.details).toEqual(expect.arrayContaining([expect.objectContaining({ path })]))
    expect(ctx.jobsService.importManual).not.toHaveBeenCalled()
  })
})

describe('GET /jobs', () => {
  it('uses the default page size', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/jobs', headers: AUTH })

    expect(response.statusCode).toBe(200)
    expect(ctx.jobsService.listForUser).toHaveBeenCalledWith(USER_ID, { limit: 20 })
  })

  it('passes limit and cursor', async () => {
    await ctx.app.inject({
      method: 'GET',
      url: `/jobs?limit=5&cursor=${JOB_ID}`,
      headers: AUTH,
    })

    expect(ctx.jobsService.listForUser).toHaveBeenCalledWith(USER_ID, { limit: 5, cursor: JOB_ID })
  })

  it.each(['limit=0', 'limit=101', 'cursor=not-a-uuid'])('rejects %s', async (query) => {
    const response = await ctx.app.inject({ method: 'GET', url: `/jobs?${query}`, headers: AUTH })
    expect(response.statusCode).toBe(400)
  })
})

describe('GET /jobs/:id', () => {
  it('returns the job', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: `/jobs/${JOB_ID}`, headers: AUTH })

    expect(response.statusCode).toBe(200)
    expect(ctx.jobsService.getForUser).toHaveBeenCalledWith(USER_ID, JOB_ID)
  })

  it('returns 404 when the job is not in the user list', async () => {
    ctx.jobsService.getForUser.mockRejectedValue(new NotFoundError('Job'))
    const response = await ctx.app.inject({ method: 'GET', url: `/jobs/${JOB_ID}`, headers: AUTH })

    expect(response.statusCode).toBe(404)
  })

  it('rejects an invalid id', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/jobs/123', headers: AUTH })
    expect(response.statusCode).toBe(400)
  })
})

describe('PATCH /jobs/:id', () => {
  it('updates with a partial body (null clears a field)', async () => {
    const response = await ctx.app.inject({
      method: 'PATCH',
      url: `/jobs/${JOB_ID}`,
      headers: AUTH,
      payload: { seniority: 'staff', salaryMin: null },
    })

    expect(response.statusCode).toBe(200)
    expect(ctx.jobsService.updateManual).toHaveBeenCalledWith(USER_ID, JOB_ID, {
      seniority: 'staff',
      salaryMin: null,
    })
  })

  it('rejects an empty body', async () => {
    const response = await ctx.app.inject({
      method: 'PATCH',
      url: `/jobs/${JOB_ID}`,
      headers: AUTH,
      payload: {},
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 403 for jobs the user did not import', async () => {
    ctx.jobsService.updateManual.mockRejectedValue(new ForbiddenError('nope'))
    const response = await ctx.app.inject({
      method: 'PATCH',
      url: `/jobs/${JOB_ID}`,
      headers: AUTH,
      payload: { title: 'New title' },
    })
    expect(response.statusCode).toBe(403)
  })
})

describe('DELETE /jobs/:id', () => {
  it('removes the job from the list with 204', async () => {
    const response = await ctx.app.inject({
      method: 'DELETE',
      url: `/jobs/${JOB_ID}`,
      headers: AUTH,
    })

    expect(response.statusCode).toBe(204)
    expect(response.body).toBe('')
    expect(ctx.jobsService.removeFromUser).toHaveBeenCalledWith(USER_ID, JOB_ID)
  })
})

describe('GET /discover', () => {
  it('lists jobs found by the user searches with pagination', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: `/discover?limit=10&cursor=${JOB_ID}`,
      headers: AUTH,
    })

    expect(response.statusCode).toBe(200)
    expect(ctx.jobsService.discoverForUser).toHaveBeenCalledWith(USER_ID, {
      limit: 10,
      cursor: JOB_ID,
    })
  })
})

describe('POST /jobs/:id/save', () => {
  it('saves the job to the list', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: `/jobs/${JOB_ID}/save`,
      headers: AUTH,
    })

    expect(response.statusCode).toBe(200)
    expect(ctx.jobsService.saveForUser).toHaveBeenCalledWith(USER_ID, JOB_ID)
  })

  it('returns 404 for jobs the user cannot see', async () => {
    ctx.jobsService.saveForUser.mockRejectedValue(new NotFoundError('Job'))

    const response = await ctx.app.inject({
      method: 'POST',
      url: `/jobs/${JOB_ID}/save`,
      headers: AUTH,
    })

    expect(response.statusCode).toBe(404)
  })
})
