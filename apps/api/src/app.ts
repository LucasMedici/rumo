import cors from '@fastify/cors'
import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import type { Container } from './container.js'
import { healthRoutes } from './modules/health/health.routes.js'
import { identityRoutes } from './modules/identity/identity.routes.js'
import { createRequireAuth } from './shared/auth.js'
import { errorHandler } from './shared/error-handler.js'

/** Builds the Fastify app without listening, so tests can use `app.inject()`. */
export function buildApp(container: Container) {
  const { env, prisma } = container

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development' && {
        transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } },
      }),
    },
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.setErrorHandler(errorHandler)
  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} not found` },
    }),
  )

  app.register(cors, { origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) })
  app.decorateRequest('auth', null)
  const requireAuth = createRequireAuth(container.tokenVerifier)

  app.register(healthRoutes({ prisma }))
  app.register(identityRoutes({ usersService: container.usersService, requireAuth }))

  app.addHook('onClose', () => container.dispose())

  return app
}

export type App = ReturnType<typeof buildApp>
