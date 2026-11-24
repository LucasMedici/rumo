import { meResponseSchema } from '@rumo/contracts'
import { describe, expect, it, vi } from 'vitest'
import { buildTestApp } from '../../../test/helpers.js'
import type { AuthIdentity, TokenVerifier } from '../../infra/auth/token-verifier.js'
import type { Prisma } from '../../infra/prisma.js'

const identity: AuthIdentity = {
  userId: '7b0c5a1e-3f2d-4c8b-9a6e-1d2f3a4b5c6d',
  email: 'lucas@example.com',
  name: 'Lucas',
  avatarUrl: null,
}

const acceptingVerifier: TokenVerifier = {
  verify: vi.fn(async (token: string) => {
    if (token !== 'good-token') throw new Error('unexpected token in test')
    return identity
  }),
}

function fakePrisma() {
  const upsert = vi.fn().mockResolvedValue({
    id: identity.userId,
    email: identity.email,
    name: identity.name,
    avatarUrl: null,
    locale: 'pt-BR',
    createdAt: new Date('2026-11-24T00:00:00Z'),
    updatedAt: new Date('2026-11-24T00:00:00Z'),
  })
  return { prisma: { user: { upsert } } as unknown as Partial<Prisma>, upsert }
}

describe('GET /me', () => {
  it('returns 401 without a token', async () => {
    const response = await buildTestApp().inject({ method: 'GET', url: '/me' })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 when the token is rejected', async () => {
    const response = await buildTestApp().inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'Bearer tampered' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.message).toBe('Invalid or expired token')
  })

  it('returns 401 for a non-Bearer scheme', async () => {
    const response = await buildTestApp({ tokenVerifier: acceptingVerifier }).inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'Basic good-token' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('syncs the user and returns the profile for a valid token', async () => {
    const { prisma, upsert } = fakePrisma()
    const app = buildTestApp({ prisma, tokenVerifier: acceptingVerifier })

    const response = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'Bearer good-token' },
    })

    expect(response.statusCode).toBe(200)
    expect(meResponseSchema.parse(response.json())).toMatchObject({
      id: identity.userId,
      email: identity.email,
      locale: 'pt-BR',
    })
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: identity.userId },
        update: { email: identity.email },
      }),
    )
  })
})
