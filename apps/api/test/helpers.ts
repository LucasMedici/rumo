import { buildApp } from '../src/app.js'
import type { Env } from '../src/config/env.js'
import type { Container } from '../src/container.js'
import { InvalidTokenError, type TokenVerifier } from '../src/infra/auth/token-verifier.js'
import type { Prisma } from '../src/infra/prisma.js'
import { UsersService } from '../src/modules/identity/users.service.js'
import { JobsService } from '../src/modules/jobs/jobs.service.js'

export const testEnv: Env = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: 0,
  LOG_LEVEL: 'silent',
  CORS_ORIGIN: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/test',
  SUPABASE_URL: 'https://test-project.supabase.co',
  RATE_LIMIT_MAX: 1000,
  TRUST_PROXY: false,
}

/** Verifier that rejects every token unless a test provides one. */
export const rejectingVerifier: TokenVerifier = {
  verify: async () => {
    throw new InvalidTokenError('test verifier rejects all tokens')
  },
}

type TestOverrides = {
  env?: Partial<Env>
  prisma?: Partial<Prisma>
  tokenVerifier?: TokenVerifier
  jobsService?: JobsService
  usersService?: UsersService
}

/** Builds the app with fakes, for HTTP tests that must not touch the database or the network. */
export function buildTestApp({
  env = {},
  prisma = {},
  tokenVerifier = rejectingVerifier,
  jobsService,
  usersService,
}: TestOverrides = {}) {
  const fakePrisma = prisma as Prisma
  const container: Container = {
    env: { ...testEnv, ...env },
    prisma: fakePrisma,
    tokenVerifier,
    usersService: usersService ?? new UsersService(fakePrisma),
    jobsService: jobsService ?? new JobsService(fakePrisma),
    dispose: async () => {},
  }
  return buildApp(container)
}
