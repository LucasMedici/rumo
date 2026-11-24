import { type NextRequest, NextResponse } from 'next/server'
import { safeNextPath } from '@/lib/routes'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Landing point for every Supabase redirect (e-mail confirmation, password recovery, OAuth):
 * exchanges the one-time `code` for a session cookie, then continues to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, origin))
  }

  return NextResponse.redirect(new URL('/login?error=link', origin))
}
