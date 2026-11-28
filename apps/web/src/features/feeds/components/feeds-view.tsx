'use client'

import type { Feed } from '@rumo/contracts'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreateFeed, useFeeds } from '../api'
import { FeedCard } from './feed-card'
import { FeedForm } from './feed-form'

export function FeedsView() {
  const { data: feeds, isPending, isError, refetch } = useFeeds()
  const createFeed = useCreateFeed()
  const [creating, setCreating] = useState(false)
  useRefreshJobsWhenRunsFinish(feeds)

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-balance font-semibold text-2xl tracking-tight">Buscas</h1>
          <p className="text-muted-foreground text-sm">
            O que o Rumo procura para você em cada fonte. O que elas encontram aparece em Descobrir.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" />
          Nova busca
        </Button>
      </div>

      {isPending ? (
        <div className="grid gap-3" role="status" aria-label="Carregando buscas">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">Não foi possível carregar suas buscas.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : feeds.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
          <div className="rounded-full bg-muted p-3">
            <Search className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-medium">Nenhuma busca ainda</h2>
          <p className="mt-1 max-w-sm text-muted-foreground text-sm">
            Crie uma busca para o Rumo trazer vagas da comunidade brasileira no GitHub ou vagas
            remotas internacionais.
          </p>
          <Button className="mt-5" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Criar primeira busca
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3">
          {feeds.map((feed) => (
            <li key={feed.id}>
              <FeedCard feed={feed} />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova busca</DialogTitle>
            <DialogDescription>Escolha a fonte e o que procurar.</DialogDescription>
          </DialogHeader>
          <FeedForm
            submitLabel="Criar busca"
            onCancel={() => setCreating(false)}
            onSubmit={async (input) => {
              await createFeed.mutateAsync(input)
              setCreating(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** When a run finishes, the job lists ("Descobrir", "Minhas vagas") may have changed. */
function useRefreshJobsWhenRunsFinish(feeds: Feed[] | undefined) {
  const queryClient = useQueryClient()
  const running = useRef(new Set<string>())

  useEffect(() => {
    if (!feeds) return
    const now = new Set(feeds.filter((f) => f.lastRun?.status === 'running').map((f) => f.id))
    const finished = [...running.current].some((id) => !now.has(id))
    running.current = now
    if (finished) {
      void queryClient.invalidateQueries({ queryKey: ['discover'] })
      void queryClient.invalidateQueries({ queryKey: ['jobs'] })
    }
  }, [feeds, queryClient])
}
