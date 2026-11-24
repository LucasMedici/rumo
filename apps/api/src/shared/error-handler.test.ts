import { errorResponseSchema } from '@rumo/contracts'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { buildTestApp } from '../../test/helpers.js'
import { NotFoundError } from './errors.js'

function appWithTestRoutes() {
  const app = buildTestApp()
  app.get('/boom/not-found', async () => {
    throw new NotFoundError('Job')
  })
  app.get('/boom/unexpected', async () => {
    throw new Error('database password is hunter2')
  })
  app.post(
    '/boom/validate',
    { schema: { body: z.object({ title: z.string().min(3) }) } },
    async () => ({ ok: true }),
  )
  return app
}

describe('error handling', () => {
  it('maps domain errors to their status and code', async () => {
    const response = await appWithTestRoutes().inject({ method: 'GET', url: '/boom/not-found' })

    expect(response.statusCode).toBe(404)
    expect(errorResponseSchema.parse(response.json()).error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Job not found',
    })
  })

  it('hides details of unexpected errors behind a generic 500', async () => {
    const response = await appWithTestRoutes().inject({ method: 'GET', url: '/boom/unexpected' })

    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    })
    expect(response.body).not.toContain('hunter2')
  })

  it('returns 400 with details on validation errors', async () => {
    const response = await appWithTestRoutes().inject({
      method: 'POST',
      url: '/boom/validate',
      payload: { title: 'x' },
    })

    expect(response.statusCode).toBe(400)
    const { error } = errorResponseSchema.parse(response.json())
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.details).toEqual([expect.objectContaining({ path: '/title' })])
  })

  it('uses the same error shape for unknown routes', async () => {
    const response = await appWithTestRoutes().inject({ method: 'GET', url: '/nope' })

    expect(response.statusCode).toBe(404)
    expect(errorResponseSchema.safeParse(response.json()).success).toBe(true)
  })
})
