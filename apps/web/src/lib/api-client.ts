import { errorResponseSchema } from '@rumo/contracts'
import type { z } from 'zod'
import { publicEnv } from './env'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Calls the Rumo API and validates the response body against a shared contract schema,
 * so the UI never works with data that doesn't match the contract.
 */
export async function apiFetch<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  init?: RequestInit,
): Promise<z.infer<TSchema>> {
  const response = await fetch(new URL(path, publicEnv.NEXT_PUBLIC_API_URL), {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  })
  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(body)
    if (parsed.success) {
      const { code, message, details } = parsed.data.error
      throw new ApiError(message, response.status, code, details)
    }
    throw new ApiError(`Request failed with status ${response.status}`, response.status, 'UNKNOWN')
  }

  return schema.parse(body)
}
