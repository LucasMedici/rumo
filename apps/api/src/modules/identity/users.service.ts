import type { User } from '@rumo/contracts'
import type { AuthIdentity } from '../../infra/auth/token-verifier.js'
import type { Prisma } from '../../infra/prisma.js'

export class UsersService {
  constructor(private readonly prisma: Prisma) {}

  /**
   * Ensures the authenticated user exists locally and keeps email in sync with the provider.
   * Profile fields (name, avatar) are only filled on creation, so later edits made in Rumo win.
   */
  async syncFromIdentity(identity: AuthIdentity): Promise<User> {
    const user = await this.prisma.user.upsert({
      where: { id: identity.userId },
      create: {
        id: identity.userId,
        email: identity.email,
        name: identity.name,
        avatarUrl: identity.avatarUrl,
      },
      update: { email: identity.email },
    })

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
      createdAt: user.createdAt.toISOString(),
    }
  }
}
