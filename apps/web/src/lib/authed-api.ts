'use client'

import type { z } from 'zod'
import { ApiError, apiFetch } from './api-client'
import { createSupabaseBrowserClient } from './supabase/client'

/** Calls the API on behalf of the signed-in user (adds the current access token). */
export async function authedApiFetch<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  init?: RequestInit,
): Promise<z.infer<TSchema>> {
  const supabase = createSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (!accessToken) throw new ApiError('Not signed in', 401, 'UNAUTHORIZED')

  return apiFetch(path, schema, { ...init, accessToken })
}
