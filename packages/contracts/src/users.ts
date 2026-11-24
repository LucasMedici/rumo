import { z } from 'zod'

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().nullable(),
  avatarUrl: z.url().nullable(),
  locale: z.string(),
  createdAt: z.iso.datetime(),
})

export type User = z.infer<typeof userSchema>

/** GET /me */
export const meResponseSchema = userSchema
export type MeResponse = z.infer<typeof meResponseSchema>
