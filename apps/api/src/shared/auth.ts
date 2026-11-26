import type { FastifyRequest, preValidationAsyncHookHandler } from 'fastify'
import {
  type AuthIdentity,
  InvalidTokenError,
  type TokenVerifier,
} from '../infra/auth/token-verifier.js'
import { UnauthorizedError } from './errors.js'

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by `requireAuth`; null on public routes. */
    auth: AuthIdentity | null
  }
}

/**
 * Builds the `requireAuth` hook: rejects requests without a valid Bearer token and exposes the
 * verified identity as `request.auth`. Use it as a `preValidation` hook: it runs after the rate
 * limit (`onRequest`, so failed attempts are counted) and before body/params validation (so
 * unauthenticated callers get 401 and learn nothing about the expected payload).
 */
export function createRequireAuth(verifier: TokenVerifier): preValidationAsyncHookHandler {
  return async (request) => {
    const token = extractBearerToken(request)
    if (!token) throw new UnauthorizedError('Missing bearer token')

    try {
      request.auth = await verifier.verify(token)
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        request.log.debug({ err: error }, 'rejected access token')
        throw new UnauthorizedError('Invalid or expired token')
      }
      throw error
    }
  }
}

/** Returns the identity set by `requireAuth`; use only in handlers protected by it. */
export function getAuth(request: FastifyRequest): AuthIdentity {
  if (!request.auth) throw new UnauthorizedError()
  return request.auth
}

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization
  if (!header) return null
  const [scheme, token] = header.split(' ')
  return scheme?.toLowerCase() === 'bearer' && token ? token : null
}
