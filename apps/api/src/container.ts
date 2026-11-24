import type { Env } from './config/env.js'

/**
 * Composition root: the only place that instantiates services and wires their dependencies.
 * New modules add their services here (e.g. `const jobsService = new JobsService(prisma)`).
 */
export function createContainer(env: Env) {
  return { env }
}

export type Container = ReturnType<typeof createContainer>
