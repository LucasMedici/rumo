import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'
import type { Env } from '../config/env.js'

/**
 * Security plugins applied to every route. Must be called on the ROOT instance (not inside
 * `app.register(...)`), otherwise Fastify encapsulation would scope them to a child context.
 * - helmet: security headers (the API only serves JSON, so the CSP denies everything)
 * - rate limit: per-IP limit, answering 429 in the standard error format
 */
export function registerSecurity(app: FastifyInstance, env: Env) {
  app.register(helmet, {
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    // The web app (another origin, same site) calls the API with CORS.
    crossOriginResourcePolicy: { policy: 'same-site' },
  })

  app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    // Thrown as an error and rendered by the central error handler ({ error: { code, message } }).
    errorResponseBuilder: (_request, context) => ({
      statusCode: context.statusCode,
      code: 'RATE_LIMITED',
      message: `Too many requests. Try again in ${context.after}.`,
    }),
  })
}
