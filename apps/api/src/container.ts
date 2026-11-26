import type { Env } from './config/env.js'
import { SupabaseTokenVerifier } from './infra/auth/supabase-token-verifier.js'
import type { TokenVerifier } from './infra/auth/token-verifier.js'
import { createPrisma, type Prisma } from './infra/prisma.js'
import { UsersService } from './modules/identity/users.service.js'
import { JobsService } from './modules/jobs/jobs.service.js'

export type Container = {
  env: Env
  prisma: Prisma
  tokenVerifier: TokenVerifier
  usersService: UsersService
  jobsService: JobsService
  dispose(): Promise<void>
}

/**
 * Composition root: the only place that instantiates services and wires their dependencies.
 * New modules add their services here (e.g. `const jobsService = new JobsService(prisma)`).
 */
export function createContainer(env: Env): Container {
  const prisma = createPrisma(env.DATABASE_URL)

  return {
    env,
    prisma,
    tokenVerifier: SupabaseTokenVerifier.forProject(env.SUPABASE_URL),
    usersService: new UsersService(prisma),
    jobsService: new JobsService(prisma),
    async dispose() {
      await prisma.$disconnect()
    },
  }
}
