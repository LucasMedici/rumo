'use client'

import { useEffect, useState } from 'react'

/** Current time, refreshed every `intervalMs` (for "available at 18:00" style labels). */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
