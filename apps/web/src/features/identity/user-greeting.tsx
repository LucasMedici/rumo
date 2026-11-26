'use client'

import { useMe } from './use-me'

/** The signed-in user's first name (from GET /me), shown in the header. */
export function UserGreeting() {
  const { data: me } = useMe()
  const name = me?.name?.split(' ')[0] ?? me?.email
  if (!name) return null

  return (
    <span className="hidden max-w-40 truncate text-muted-foreground text-sm sm:inline">{name}</span>
  )
}
