import { describe, expect, it } from 'vitest'
import { errorResponseSchema, healthResponseSchema } from './index.ts'

describe('healthResponseSchema', () => {
  it('accepts a valid payload', () => {
    const payload = {
      status: 'degraded',
      database: 'down',
      uptime: 12.5,
      timestamp: '2026-11-24T01:30:18.577Z',
    }
    expect(healthResponseSchema.parse(payload)).toEqual(payload)
  })

  it('rejects unknown status values and non-ISO timestamps', () => {
    const result = healthResponseSchema.safeParse({
      status: 'maybe',
      database: 'up',
      uptime: 1,
      timestamp: 'yesterday',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(['status', 'timestamp'])
  })
})

describe('errorResponseSchema', () => {
  it('treats details as optional', () => {
    expect(errorResponseSchema.safeParse({ error: { code: 'X', message: 'y' } }).success).toBe(true)
  })
})
