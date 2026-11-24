import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from 'jose'
import { z } from 'zod'
import { type AuthIdentity, InvalidTokenError, type TokenVerifier } from './token-verifier.js'

/** Claims we rely on from a Supabase access token. */
const claimsSchema = z.object({
  sub: z.uuid(),
  email: z.email(),
  user_metadata: z
    .object({
      full_name: z.string().optional(),
      name: z.string().optional(),
      avatar_url: z.url().optional(),
    })
    .partial()
    .optional(),
})

type Options = {
  /** e.g. https://<ref>.supabase.co/auth/v1 */
  issuer: string
  /** Key resolver; defaults to the project's public JWKS (cached and refreshed by jose). */
  keys?: JWTVerifyGetKey
}

/**
 * Verifies Supabase access tokens locally with the project's public signing keys (ES256).
 * No network call per request: keys are fetched once and cached.
 */
export class SupabaseTokenVerifier implements TokenVerifier {
  private readonly issuer: string
  private readonly keys: JWTVerifyGetKey

  constructor({ issuer, keys }: Options) {
    this.issuer = issuer
    this.keys = keys ?? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))
  }

  static forProject(supabaseUrl: string) {
    return new SupabaseTokenVerifier({ issuer: `${supabaseUrl}/auth/v1` })
  }

  async verify(token: string): Promise<AuthIdentity> {
    let payload: unknown
    try {
      ;({ payload } = await jwtVerify(token, this.keys, {
        issuer: this.issuer,
        audience: 'authenticated',
        algorithms: ['ES256'],
      }))
    } catch (error) {
      throw new InvalidTokenError(error instanceof Error ? error.message : 'verification failed', {
        cause: error,
      })
    }

    const claims = claimsSchema.safeParse(payload)
    if (!claims.success) throw new InvalidTokenError('missing or malformed claims')

    const { sub, email, user_metadata: meta } = claims.data
    return {
      userId: sub,
      email: email.toLowerCase(),
      name: meta?.full_name ?? meta?.name ?? null,
      avatarUrl: meta?.avatar_url ?? null,
    }
  }
}
