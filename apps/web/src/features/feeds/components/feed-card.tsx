'use client'

import type { Feed } from '@rumo/contracts'
import { CircleAlert, Loader2, Pencil, Play, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { ApiError } from '@/lib/api-client'
import { useNow } from '@/lib/use-now'
import { useDeleteFeed, useRunFeed, useUpdateFeed } from '../api'
import { describeFeedConfig, formatWhen, SOURCE_LABELS } from '../format'
import { FeedForm, toUpdateInput } from './feed-form'

export function FeedCard({ feed }: { feed: Feed }) {
  const now = useNow()
  const runFeed = useRunFeed(feed.id)
  const updateFeed = useUpdateFeed(feed.id)
  const [editing, setEditing] = useState(false)

  const running = feed.lastRun?.status === 'running' || runFeed.isPending
  const nextRunAt = feed.nextRunAt && new Date(feed.nextRunAt) > now ? feed.nextRunAt : null
  const runError =
    runFeed.error instanceof ApiError && runFeed.error.code === 'RUN_TOO_SOON'
      ? 'A fonte ainda não permite buscar de novo.'
      : runFeed.error
        ? 'Não foi possível iniciar a busca.'
        : null

  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">{feed.name}</h2>
            <Badge variant="secondary">{SOURCE_LABELS[feed.sourceKey] ?? feed.sourceName}</Badge>
          </div>
          <p className="mt-1 truncate text-muted-foreground text-sm">{describeFeedConfig(feed)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-muted-foreground text-sm">
          {feed.enabled ? 'Ativa' : 'Pausada'}
          <Switch
            checked={feed.enabled}
            disabled={updateFeed.isPending}
            onCheckedChange={(enabled) => updateFeed.mutate({ enabled })}
            aria-label={feed.enabled ? 'Pausar busca' : 'Reativar busca'}
          />
        </div>
      </div>

      <RunStatus feed={feed} running={running} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => runFeed.mutate()}
          disabled={running || !feed.enabled || Boolean(nextRunAt)}
        >
          {running ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
          {running ? 'Buscando…' : 'Buscar agora'}
        </Button>
        {nextRunAt && !running ? (
          <span className="text-muted-foreground text-xs">
            Disponível {formatWhen(nextRunAt, now)}
          </span>
        ) : null}
        {!feed.enabled ? (
          <span className="text-muted-foreground text-xs">Reative a busca para executar.</span>
        ) : null}
        {runError ? <span className="text-destructive text-xs">{runError}</span> : null}

        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" />
            Editar
          </Button>
          <DeleteFeedButton feed={feed} />
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar busca</DialogTitle>
            <DialogDescription>
              {SOURCE_LABELS[feed.sourceKey] ?? feed.sourceName}
            </DialogDescription>
          </DialogHeader>
          <FeedForm
            feed={feed}
            submitLabel="Salvar alterações"
            onCancel={() => setEditing(false)}
            onSubmit={async (input) => {
              await updateFeed.mutateAsync(toUpdateInput(input))
              setEditing(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </article>
  )
}

function RunStatus({ feed, running }: { feed: Feed; running: boolean }) {
  const run = feed.lastRun
  const base = 'mt-3 flex items-center gap-1.5 text-sm'

  if (running) {
    return (
      <p className={`${base} text-muted-foreground`} role="status">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Buscando vagas…
        {run && run.stats.fetched > 0 ? ` ${run.stats.fetched} encontradas até agora` : ''}
      </p>
    )
  }
  if (!run) {
    return <p className={`${base} text-muted-foreground`}>Ainda não executada.</p>
  }

  const when = formatWhen(run.finishedAt ?? run.startedAt)
  if (run.status === 'failed') {
    return (
      <p className={`${base} text-destructive`}>
        <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />A última busca falhou (
        {when}). Tente de novo mais tarde.
      </p>
    )
  }

  const { fetched, created, failed } = run.stats
  return (
    <p className={`${base} text-muted-foreground`}>
      Última busca {when} · {fetched} {fetched === 1 ? 'vaga encontrada' : 'vagas encontradas'}
      {created > 0 ? (
        <span className="rounded-full bg-highlight px-1.5 font-medium text-highlight-foreground text-xs">
          {created} {created === 1 ? 'nova' : 'novas'}
        </span>
      ) : (
        ' · nenhuma nova'
      )}
      {failed > 0 ? ` · ${failed} com problema` : ''}
    </p>
  )
}

function DeleteFeedButton({ feed }: { feed: Feed }) {
  const deleteFeed = useDeleteFeed(feed.id)

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
        <Trash2 aria-hidden="true" />
        Excluir
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir a busca “{feed.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            As vagas que só ela encontrou saem de Descobrir. As que você salvou continuam em Minhas
            vagas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteFeed.isError ? (
          <p className="text-destructive text-sm">Não foi possível excluir agora. Tente de novo.</p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => deleteFeed.mutate()}
            disabled={deleteFeed.isPending}
          >
            {deleteFeed.isPending ? 'Excluindo…' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
