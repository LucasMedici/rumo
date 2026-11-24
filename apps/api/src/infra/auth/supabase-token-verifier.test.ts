import { createLocalJWKSet, exportJWK, generateKeyPair, type JWK, SignJWT } from 'jose'
import { beforeAll, describe, expect, it } from 'vitest'
import { SupabaseTokenVerifier } from './supabase-token-verifier.js'
import { InvalidTokenError } from './token-verifier.js'

const ISSUER = 'https://test-project.supabase.co/auth/v1'
const USER_ID = '7b0c5a1e-3f2d-4c8b-9a6e-1d2f3a4b5c6d'

let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey']
let verifier: SupabaseTokenVerifier

beforeAll(async () => {
  const pair = await generateKeyPair('ES256')
  privateKey = pair.privateKey
  const publicJwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: 'test-key', alg: 'ES256' }
  verifier = new SupabaseTokenVerifier({
    issuer: ISSUER,
    keys: createLocalJWKSet({ keys: [publicJwk] }),
  })
})

function token(
  overrides: { claims?: Record<string, unknown>; issuer?: string; expiresIn?: string } = {},
) {
  return new SignJWT({
    email: 'Lucas@Example.com',
    user_metadata: { full_name: 'Lucas', avatar_url: 'https://example.com/a.png' },
    ...overrides.claims,
  })
    .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
    .setSubject(USER_ID)
    .setIssuer(overrides.issuer ?? ISSUER)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime(overrides.expiresIn ?? '1h')
    .sign(privateKey)
}

describe('SupabaseTokenVerifier', () => {
  it('returns the identity of a valid token (email normalized to lowercase)', async () => {
    await expect(verifier.verify(await token())).resolves.toEqual({
      userId: USER_ID,
      email: 'lucas@example.com',
      name: 'Lucas',
      avatarUrl: 'https://example.com/a.png',
    })
  })

  it('rejects an expired token', async () => {
    const expired = await token({ expiresIn: '-1m' })
    await expect(verifier.verify(expired)).rejects.toBeInstanceOf(InvalidTokenError)
  })

  it('rejects a token from another issuer', async () => {
    const foreign = await token({ issuer: 'https://evil.supabase.co/auth/v1' })
    await expect(verifier.verify(foreign)).rejects.toBeInstanceOf(InvalidTokenError)
  })

  it('rejects a token signed with a different key', async () => {
    const attacker = await generateKeyPair('ES256')
    const forged = await new SignJWT({ email: 'x@example.com' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setSubject(USER_ID)
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(attacker.privateKey)
    await expect(verifier.verify(forged)).rejects.toBeInstanceOf(InvalidTokenError)
  })

  it('rejects an HS256 token (algorithm confusion)', async () => {
    const hs = await new SignJWT({ email: 'x@example.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USER_ID)
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('a-guessed-shared-secret-of-enough-length'))
    await expect(verifier.verify(hs)).rejects.toBeInstanceOf(InvalidTokenError)
  })

  it('rejects a valid signature with missing email claim', async () => {
    const noEmail = await token({ claims: { email: undefined } })
    await expect(verifier.verify(noEmail)).rejects.toBeInstanceOf(InvalidTokenError)
  })

  it('rejects garbage', async () => {
    await expect(verifier.verify('not-a-jwt')).rejects.toBeInstanceOf(InvalidTokenError)
  })
})
