'use client'

import {
  type CreateFeedInput,
  type Feed,
  feedListResponseSchema,
  feedSchema,
  ingestionRunSchema,
  type UpdateFeedInput,
} from '@rumo/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { authedApiFetch } from '@/lib/authed-api'

export const feedKeys = { all: ['feeds'] as const }

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const isRunning = (feeds: Feed[] | undefined) =>
  Boolean(feeds?.some((feed) => feed.lastRun?.status === 'running'))

/** The user's saved searches. Polls every 2s while a run is in progress. */
export function useFeeds() {
  return useQuery({
    queryKey: feedKeys.all,
    queryFn: async () => (await authedApiFetch('/feeds', feedListResponseSchema)).items,
    refetchInterval: (query) => (isRunning(query.state.data) ? 2_000 : false),
  })
}

function useFeedMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: feedKeys.all }),
  })
}

export function useCreateFeed() {
  return useFeedMutation((input: CreateFeedInput) =>
    authedApiFetch('/feeds', feedSchema, json('POST', input)),
  )
}

export function useUpdateFeed(id: string) {
  return useFeedMutation((input: UpdateFeedInput) =>
    authedApiFetch(`/feeds/${id}`, feedSchema, json('PATCH', input)),
  )
}

export function useDeleteFeed(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authedApiFetch(`/feeds/${id}`, z.null(), { method: 'DELETE' }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: feedKeys.all }),
        // The jobs this search found leave "Descobrir".
        queryClient.invalidateQueries({ queryKey: ['discover'] }),
      ]),
  })
}

/** Starts a run (202); the list then polls until it finishes. */
export function useRunFeed(id: string) {
  return useFeedMutation(() =>
    authedApiFetch(`/feeds/${id}/runs`, ingestionRunSchema, { method: 'POST' }),
  )
}
