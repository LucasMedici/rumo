import { buildApp } from '../src/app.js'
import type { Env } from '../src/config/env.js'
import type { Container } from '../src/container.js'
import { InvalidTokenError, type TokenVerifier } from '../src/infra/auth/token-verifier.js'
import type { HttpClient } from '../src/infra/http/http-client.js'
import type { Prisma } from '../src/infra/prisma.js'
import { UsersService } from '../src/modules/identity/users.service.js'
import { FeedsService } from '../src/modules/ingestion/feeds.service.js'
import { IngestionRunner } from '../src/modules/ingestion/ingestion-runner.js'
import { createSourceRegistry } from '../src/modules/job-sources/core/registry.js'
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
  feedsService?: FeedsService
}

/** Builds the app with fakes, for HTTP tests that must not touch the database or the network. */
export function buildTestApp({
  env = {},
  prisma = {},
  tokenVerifier = rejectingVerifier,
  jobsService,
  usersService,
  feedsService,
}: TestOverrides = {}) {
  const fakePrisma = prisma as Prisma
  const jobs = jobsService ?? new JobsService(fakePrisma)
  const registry = createSourceRegistry([])
  const noNetwork: HttpClient = {
    getJson: async () => {
      throw new Error('network access is not allowed in tests')
    },
  }
  const runner = new IngestionRunner({ prisma: fakePrisma, registry, http: noNetwork, jobs })
  const container: Container = {
    env: { ...testEnv, ...env },
    prisma: fakePrisma,
    tokenVerifier,
    usersService: usersService ?? new UsersService(fakePrisma),
    jobsService: jobs,
    feedsService: feedsService ?? new FeedsService({ prisma: fakePrisma, registry, runner }),
    ingestionRunner: runner,
    dispose: async () => {},
  }
  return buildApp(container)
}
