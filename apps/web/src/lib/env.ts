import { z } from 'zod'

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
})

// Each NEXT_PUBLIC_* var must be referenced explicitly so Next.js can inline it at build time.
export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
})
