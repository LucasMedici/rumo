import { type NextRequest, NextResponse } from 'next/server'
import { HOME_ROUTE } from '@/lib/routes'
import { updateSession } from '@/lib/supabase/proxy-session'

/** Routes anyone can open. Everything else requires a session. */
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password']
const PUBLIC_PREFIXES = ['/auth/']
/** Logged-in users are sent to the app instead of these pages. */
const GUEST_ONLY_ROUTES = ['/login', '/signup', '/forgot-password']

/**
 * Optimistic auth gate: keeps the session fresh and redirects based on it.
 * Real authorization happens in the API, which verifies the access token on every request.
 */
export async function proxy(request: NextRequest) {
  const { response, isAuthenticated } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isPublic =
    PUBLIC_ROUTES.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))

  if (!isAuthenticated && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', pathname)
    return redirectWithCookies(url, response)
  }

  if (isAuthenticated && GUEST_ONLY_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = HOME_ROUTE
    url.search = ''
    return redirectWithCookies(url, response)
  }

  return response
}

/** Redirects while keeping any refreshed session cookies set by `updateSession`. */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url)
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie)
  return redirect
}

export const config = {
  matcher: [
    // Everything except static files, images and metadata files.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
