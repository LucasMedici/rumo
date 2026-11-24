import { buildApp } from '../src/app.js'
import type { Env } from '../src/config/env.js'
import type { Container } from '../src/container.js'
import type { Prisma } from '../src/infra/prisma.js'

export const testEnv: Env = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: 0,
  LOG_LEVEL: 'silent',
  CORS_ORIGIN: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/test',
}

/** Builds the app with a fake Prisma, for HTTP tests that must not touch the database. */
export function buildTestApp(prisma: Partial<Prisma> = {}) {
  const container: Container = {
    env: testEnv,
    prisma: prisma as Prisma,
    dispose: async () => {},
  }
  return buildApp(container)
}
