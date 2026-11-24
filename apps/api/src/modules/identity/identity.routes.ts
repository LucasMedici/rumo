import { meResponseSchema } from '@rumo/contracts'
import type { preHandlerAsyncHookHandler } from 'fastify'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { getAuth } from '../../shared/auth.js'
import type { UsersService } from './users.service.js'

type Deps = {
  usersService: UsersService
  requireAuth: preHandlerAsyncHookHandler
}

export const identityRoutes =
  ({ usersService, requireAuth }: Deps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get(
      '/me',
      { preHandler: requireAuth, schema: { response: { 200: meResponseSchema } } },
      async (request) => usersService.syncFromIdentity(getAuth(request)),
    )
  }
