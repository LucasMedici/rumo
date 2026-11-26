import {
  importJobSchema,
  jobDetailSchema,
  jobIdParamsSchema,
  jobListResponseSchema,
  listJobsQuerySchema,
  updateJobSchema,
} from '@rumo/contracts'
import type { preValidationAsyncHookHandler } from 'fastify'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { getAuth } from '../../shared/auth.js'
import type { UsersService } from '../identity/users.service.js'
import type { JobsService } from './jobs.service.js'

type Deps = {
  jobsService: Pick<
    JobsService,
    'importManual' | 'listForUser' | 'getForUser' | 'updateManual' | 'removeFromUser'
  >
  usersService: Pick<UsersService, 'syncFromIdentity'>
  requireAuth: preValidationAsyncHookHandler
}

export const jobsRoutes =
  ({ jobsService, usersService, requireAuth }: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    // preValidation: after the rate limit (onRequest) and before body/params validation,
    // so unauthenticated callers are counted by the rate limit and get 401 (not 400).
    app.addHook('preValidation', requireAuth)

    app.post(
      '/jobs/import',
      { schema: { body: importJobSchema, response: { 201: jobDetailSchema } } },
      async (request, reply) => {
        const auth = getAuth(request)
        // Jobs reference the local user row; make sure it exists before the first write.
        await usersService.syncFromIdentity(auth)
        const job = await jobsService.importManual(auth.userId, request.body)
        return reply.status(201).send(job)
      },
    )

    app.get(
      '/jobs',
      { schema: { querystring: listJobsQuerySchema, response: { 200: jobListResponseSchema } } },
      async (request) => jobsService.listForUser(getAuth(request).userId, request.query),
    )

    app.get(
      '/jobs/:id',
      { schema: { params: jobIdParamsSchema, response: { 200: jobDetailSchema } } },
      async (request) => jobsService.getForUser(getAuth(request).userId, request.params.id),
    )

    app.patch(
      '/jobs/:id',
      {
        schema: {
          params: jobIdParamsSchema,
          body: updateJobSchema,
          response: { 200: jobDetailSchema },
        },
      },
      async (request) =>
        jobsService.updateManual(getAuth(request).userId, request.params.id, request.body),
    )

    app.delete('/jobs/:id', { schema: { params: jobIdParamsSchema } }, async (request, reply) => {
      await jobsService.removeFromUser(getAuth(request).userId, request.params.id)
      return reply.status(204).send()
    })
  }
