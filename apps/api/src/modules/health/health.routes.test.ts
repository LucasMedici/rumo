import { healthResponseSchema } from '@rumo/contracts'
import { describe, expect, it, vi } from 'vitest'
import { buildTestApp } from '../../../test/helpers.js'
import type { Prisma } from '../../infra/prisma.js'

describe('GET /health', () => {
  it('reports ok when the database answers', async () => {
    const app = buildTestApp({ $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) as never })

    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    const body = healthResponseSchema.parse(response.json())
    expect(body).toMatchObject({ status: 'ok', database: 'up' })
  })

  it('reports degraded (still 200) when the database fails', async () => {
    const failing: Partial<Prisma> = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('connection refused')) as never,
    }
    const app = buildTestApp(failing)

    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'degraded', database: 'down' })
  })
})
