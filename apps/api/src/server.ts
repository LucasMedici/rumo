import { buildApp } from './app.js'
import { loadEnv } from './config/env.js'
import { createContainer } from './container.js'

const env = loadEnv()
const container = createContainer(env)
const app = buildApp(container)

// Runs left "running" by a previous process will never finish; free their feeds.
await container.ingestionRunner.recoverInterruptedRuns().catch((error: unknown) => {
  app.log.error({ err: error }, 'could not recover interrupted ingestion runs')
})

const shutdown = async (signal: string) => {
  app.log.info(`${signal} received, shutting down`)
  await app.close()
  process.exit(0)
}
process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

try {
  await app.listen({ host: env.HOST, port: env.PORT })
} catch (error) {
  app.log.fatal(error)
  process.exit(1)
}
