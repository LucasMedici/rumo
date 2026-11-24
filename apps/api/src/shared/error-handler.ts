import type { ErrorResponse } from '@rumo/contracts'
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod'
import { AppError } from './errors.js'

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (hasZodFastifySchemaValidationErrors(error)) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation.map((issue) => ({
          path: issue.instancePath,
          message: issue.message,
        })),
      },
    } satisfies ErrorResponse)
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message, details: error.details },
    } satisfies ErrorResponse)
  }

  if (isResponseSerializationError(error)) {
    request.log.error({ err: error, issues: error.cause.issues }, 'response serialization failed')
  } else if (error.statusCode && error.statusCode < 500) {
    // Fastify-level client errors (malformed JSON, payload too large, ...)
    return reply.status(error.statusCode).send({
      error: { code: error.code ?? 'BAD_REQUEST', message: error.message },
    } satisfies ErrorResponse)
  } else {
    request.log.error({ err: error }, 'unhandled error')
  }

  return reply.status(500).send({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  } satisfies ErrorResponse)
}
