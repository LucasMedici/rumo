import type { Env } from './config/env.js'
import { createPrisma } from './infra/prisma.js'

/**
 * Composition root: the only place that instantiates services and wires their dependencies.
 * New modules add their services here (e.g. `const jobsService = new JobsService(prisma)`).
 */
export function createContainer(env: Env) {
  const prisma = createPrisma(env.DATABASE_URL)

  return {
    env,
    prisma,
    async dispose() {
      await prisma.$disconnect()
    },
  }
}

export type Container = ReturnType<typeof createContainer>
