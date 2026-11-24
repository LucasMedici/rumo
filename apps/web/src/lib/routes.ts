/** Where users land after signing in. */
export const HOME_ROUTE = '/dashboard'

/** Only allows same-site relative paths, to avoid open redirects via `?next=`. */
export function safeNextPath(next: string | null | undefined, fallback = HOME_ROUTE): string {
  if (!next?.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback
  }
  return next
}
