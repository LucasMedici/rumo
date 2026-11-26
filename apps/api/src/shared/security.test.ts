import { errorResponseSchema } from '@rumo/contracts'
import { describe, expect, it, vi } from 'vitest'
import { buildTestApp } from '../../test/helpers.js'

const healthyPrisma = { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) as never }

describe('security headers', () => {
  it('adds hardening headers to every response', async () => {
    const response = await buildTestApp({ prisma: healthyPrisma }).inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.headers).toMatchObject({
      'content-security-policy': expect.stringContaining("default-src 'none'"),
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
      'strict-transport-security': expect.stringContaining('max-age='),
      'cross-origin-resource-policy': 'same-site',
    })
    expect(response.headers['x-powered-by']).toBeUndefined()
  })

  it('applies headers to error responses too', async () => {
    const response = await buildTestApp().inject({ method: 'GET', url: '/does-not-exist' })

    expect(response.statusCode).toBe(404)
    expect(response.headers['x-content-type-options']).toBe('nosniff')
  })
})

describe('rate limit', () => {
  it('answers 429 in the standard error format after the limit', async () => {
    const app = buildTestApp({ env: { RATE_LIMIT_MAX: 3 }, prisma: healthyPrisma })

    const statuses: number[] = []
    for (let i = 0; i < 3; i++) {
      statuses.push((await app.inject({ method: 'GET', url: '/health' })).statusCode)
    }
    const blocked = await app.inject({ method: 'GET', url: '/health' })

    expect(statuses).toEqual([200, 200, 200])
    expect(blocked.statusCode).toBe(429)
    expect(errorResponseSchema.parse(blocked.json()).error.code).toBe('RATE_LIMITED')
    expect(blocked.headers['retry-after']).toBeDefined()
  })

  it('also limits protected routes, even when the token is rejected', async () => {
    const app = buildTestApp({ env: { RATE_LIMIT_MAX: 2 } })

    const attempts = []
    for (let i = 0; i < 3; i++) {
      attempts.push(
        await app.inject({
          method: 'GET',
          url: '/me',
          headers: { authorization: 'Bearer guessed-token' },
        }),
      )
    }

    expect(attempts.map((r) => r.statusCode)).toEqual([401, 401, 429])
  })

  it('counts each client IP separately', async () => {
    const app = buildTestApp({ env: { RATE_LIMIT_MAX: 1 }, prisma: healthyPrisma })

    const first = await app.inject({ method: 'GET', url: '/health', remoteAddress: '10.0.0.1' })
    const other = await app.inject({ method: 'GET', url: '/health', remoteAddress: '10.0.0.2' })
    const again = await app.inject({ method: 'GET', url: '/health', remoteAddress: '10.0.0.1' })

    expect([first.statusCode, other.statusCode, again.statusCode]).toEqual([200, 200, 429])
  })

  it('ignores X-Forwarded-For unless TRUST_PROXY is enabled (no IP spoofing)', async () => {
    const app = buildTestApp({ env: { RATE_LIMIT_MAX: 1 }, prisma: healthyPrisma })

    const first = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-forwarded-for': '1.1.1.1' },
    })
    const spoofed = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-forwarded-for': '2.2.2.2' },
    })

    expect([first.statusCode, spoofed.statusCode]).toEqual([200, 429])
  })
})
