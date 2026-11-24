/** Identity extracted from a verified access token, independent of the auth provider. */
export type AuthIdentity = {
  userId: string
  email: string
  name: string | null
  avatarUrl: string | null
}

/**
 * Verifies an access token and returns who it belongs to.
 * The app depends only on this interface, so the auth provider can be swapped.
 * Implementations must throw `InvalidTokenError` for any invalid, expired or forged token.
 */
export interface TokenVerifier {
  verify(token: string): Promise<AuthIdentity>
}

export class InvalidTokenError extends Error {
  constructor(reason: string, options?: ErrorOptions) {
    super(`Invalid access token: ${reason}`, options)
    this.name = 'InvalidTokenError'
  }
}
