import { buildApp } from './app.js'
import { loadEnv } from './config/env.js'
import { createContainer } from './container.js'

const env = loadEnv()
const app = buildApp(createContainer(env))

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
