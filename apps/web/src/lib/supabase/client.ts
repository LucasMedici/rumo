import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'

/** Supabase client for Client Components (session stored in cookies, singleton per tab). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
}
