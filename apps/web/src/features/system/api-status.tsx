'use client'

import { healthResponseSchema } from '@rumo/contracts'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'

export function ApiStatus() {
  const { isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch('/health', healthResponseSchema),
    refetchInterval: 10_000,
    retry: false,
  })

  const state = isPending
    ? { label: 'Verificando API…', dot: 'bg-neutral-400' }
    : isError
      ? { label: 'API offline', dot: 'bg-red-500' }
      : { label: 'API online', dot: 'bg-emerald-500' }

  return (
    <output className="inline-flex items-center gap-2 text-neutral-500 text-sm dark:text-neutral-400">
      <span className={`size-2 rounded-full ${state.dot}`} aria-hidden="true" />
      {state.label}
    </output>
  )
}
