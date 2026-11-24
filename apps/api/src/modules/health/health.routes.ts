import { type HealthResponse, healthResponseSchema } from '@rumo/contracts'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import type { Prisma } from '../../infra/prisma.js'

const DB_CHECK_TIMEOUT_MS = 3_000

type Deps = { prisma: Prisma }

/**
 * Liveness + dependency check. Always answers 200 while the process is alive;
 * `status: degraded` signals that the database is unreachable.
 */
export const healthRoutes =
  ({ prisma }: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get('/health', { schema: { response: { 200: healthResponseSchema } } }, async (request) => {
      const database = await checkDatabase(prisma).catch((error: unknown) => {
        request.log.warn({ err: error }, 'database health check failed')
        return 'down' as const
      })

      return {
        status: database === 'up' ? 'ok' : 'degraded',
        database,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      } satisfies HealthResponse
    })
  }

async function checkDatabase(prisma: Prisma): Promise<'up'> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('database check timed out')), DB_CHECK_TIMEOUT_MS)
  })
  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout])
    return 'up'
  } finally {
    clearTimeout(timer)
  }
}
