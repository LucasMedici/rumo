'use client'

import { meResponseSchema } from '@rumo/contracts'
import { useQuery } from '@tanstack/react-query'
import { authedApiFetch } from '@/lib/authed-api'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => authedApiFetch('/me', meResponseSchema),
  })
}
