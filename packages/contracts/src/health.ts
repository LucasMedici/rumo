import { z } from 'zod'

export const healthResponseSchema = z.object({
  /** `degraded` when the API is up but a dependency (e.g. the database) is not. */
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['up', 'down']),
  uptime: z.number(),
  timestamp: z.iso.datetime(),
})

export type HealthResponse = z.infer<typeof healthResponseSchema>
