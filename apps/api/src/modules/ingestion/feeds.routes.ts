import {
  createFeedSchema,
  feedIdParamsSchema,
  feedListResponseSchema,
  feedSchema,
  ingestionRunSchema,
  runListResponseSchema,
  runParamsSchema,
  updateFeedSchema,
} from '@rumo/contracts'
import type { preValidationAsyncHookHandler } from 'fastify'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { getAuth } from '../../shared/auth.js'
import type { UsersService } from '../identity/users.service.js'
import type { FeedsService } from './feeds.service.js'

type Deps = {
  feedsService: Pick<
    FeedsService,
    'list' | 'get' | 'create' | 'update' | 'remove' | 'startRun' | 'listRuns' | 'getRun'
  >
  usersService: Pick<UsersService, 'syncFromIdentity'>
  requireAuth: preValidationAsyncHookHandler
}

export const feedsRoutes =
  ({ feedsService, usersService, requireAuth }: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    // preValidation: after the rate limit (onRequest) and before body/params validation.
    app.addHook('preValidation', requireAuth)

    app.get(
      '/feeds',
      { schema: { response: { 200: feedListResponseSchema } } },
      async (request) => ({
        items: await feedsService.list(getAuth(request).userId),
      }),
    )

    app.post(
      '/feeds',
      { schema: { body: createFeedSchema, response: { 201: feedSchema } } },
      async (request, reply) => {
        const auth = getAuth(request)
        await usersService.syncFromIdentity(auth) // feeds reference the local user row
        return reply.status(201).send(await feedsService.create(auth.userId, request.body))
      },
    )

    app.get(
      '/feeds/:id',
      { schema: { params: feedIdParamsSchema, response: { 200: feedSchema } } },
      async (request) => feedsService.get(getAuth(request).userId, request.params.id),
    )

    app.patch(
      '/feeds/:id',
      {
        schema: {
          params: feedIdParamsSchema,
          body: updateFeedSchema,
          response: { 200: feedSchema },
        },
      },
      async (request) =>
        feedsService.update(getAuth(request).userId, request.params.id, request.body),
    )

    app.delete('/feeds/:id', { schema: { params: feedIdParamsSchema } }, async (request, reply) => {
      await feedsService.remove(getAuth(request).userId, request.params.id)
      return reply.status(204).send()
    })

    app.post(
      '/feeds/:id/runs',
      { schema: { params: feedIdParamsSchema, response: { 202: ingestionRunSchema } } },
      async (request, reply) =>
        reply
          .status(202)
          .send(await feedsService.startRun(getAuth(request).userId, request.params.id)),
    )

    app.get(
      '/feeds/:id/runs',
      { schema: { params: feedIdParamsSchema, response: { 200: runListResponseSchema } } },
      async (request) => ({
        items: await feedsService.listRuns(getAuth(request).userId, request.params.id),
      }),
    )

    app.get(
      '/feeds/:id/runs/:runId',
      { schema: { params: runParamsSchema, response: { 200: ingestionRunSchema } } },
      async (request) =>
        feedsService.getRun(getAuth(request).userId, request.params.id, request.params.runId),
    )
  }
