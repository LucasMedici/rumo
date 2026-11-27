import type { Env } from './config/env.js'
import { SupabaseTokenVerifier } from './infra/auth/supabase-token-verifier.js'
import type { TokenVerifier } from './infra/auth/token-verifier.js'
import { createHttpClient } from './infra/http/http-client.js'
import { createPrisma, type Prisma } from './infra/prisma.js'
import { UsersService } from './modules/identity/users.service.js'
import { FeedsService } from './modules/ingestion/feeds.service.js'
import { IngestionRunner } from './modules/ingestion/ingestion-runner.js'
import { remotiveAdapter } from './modules/job-sources/adapters/remotive/remotive.adapter.js'
import { createSourceRegistry } from './modules/job-sources/core/registry.js'
import { JobsService } from './modules/jobs/jobs.service.js'

export type Container = {
  env: Env
  prisma: Prisma
  tokenVerifier: TokenVerifier
  usersService: UsersService
  jobsService: JobsService
  feedsService: FeedsService
  ingestionRunner: IngestionRunner
  dispose(): Promise<void>
}

/**
 * Composition root: the only place that instantiates services and wires their dependencies.
 * New modules add their services here; new job sources are added to the registry list.
 */
export function createContainer(env: Env): Container {
  const prisma = createPrisma(env.DATABASE_URL)
  const jobsService = new JobsService(prisma)
  const registry = createSourceRegistry([remotiveAdapter])
  const ingestionRunner = new IngestionRunner({
    prisma,
    registry,
    http: createHttpClient(),
    jobs: jobsService,
  })

  return {
    env,
    prisma,
    tokenVerifier: SupabaseTokenVerifier.forProject(env.SUPABASE_URL),
    usersService: new UsersService(prisma),
    jobsService,
    feedsService: new FeedsService({ prisma, registry, runner: ingestionRunner }),
    ingestionRunner,
    async dispose() {
      await prisma.$disconnect()
    },
  }
}
