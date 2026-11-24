import { z } from 'zod'

/** Shape of every error response returned by the API. */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})

export type ErrorResponse = z.infer<typeof errorResponseSchema>
