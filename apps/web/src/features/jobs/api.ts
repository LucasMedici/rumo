'use client'

import {
  type ImportJobInput,
  type JobDetail,
  jobDetailSchema,
  jobListResponseSchema,
  type UpdateJobInput,
} from '@rumo/contracts'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { authedApiFetch } from '@/lib/authed-api'

const PAGE_SIZE = 20

export const jobKeys = {
  all: ['jobs'] as const,
  list: () => [...jobKeys.all, 'list'] as const,
  detail: (id: string) => [...jobKeys.all, 'detail', id] as const,
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

/** The user's jobs, page by page ("load more"). */
export function useJobs() {
  return useInfiniteQuery({
    queryKey: jobKeys.list(),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) })
      if (pageParam) params.set('cursor', pageParam)
      return authedApiFetch(`/jobs?${params}`, jobListResponseSchema)
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}

export function useJob(id: string) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: () => authedApiFetch(`/jobs/${id}`, jobDetailSchema),
  })
}

/** Caches the returned job and refreshes the list after any change. */
function useJobMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<JobDetail>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (job) => {
      queryClient.setQueryData(jobKeys.detail(job.id), job)
      return queryClient.invalidateQueries({ queryKey: jobKeys.list() })
    },
  })
}

export function useImportJob() {
  return useJobMutation((input: ImportJobInput) =>
    authedApiFetch('/jobs/import', jobDetailSchema, json('POST', input)),
  )
}

export function useUpdateJob(id: string) {
  return useJobMutation((input: UpdateJobInput) =>
    authedApiFetch(`/jobs/${id}`, jobDetailSchema, json('PATCH', input)),
  )
}

export function useRemoveJob(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authedApiFetch(`/jobs/${id}`, z.null(), { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: jobKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: jobKeys.list() })
    },
  })
}
