'use client'

import { ArrowLeft, Search, Telescope } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDiscover, useJob } from '@/features/jobs/api'
import { JobDetail } from '@/features/jobs/components/job-detail'
import { JobDetailSkeleton } from '@/features/jobs/components/job-detail-view'
import { useMediaQuery } from '@/lib/use-media-query'
import { useNow } from '@/lib/use-now'
import { DiscoverItem } from './discover-item'

/** Height of the scrollable columns: viewport minus the page header area. */
const COLUMN_HEIGHT = 'lg:h-[calc(100dvh-8.5rem)]'

/**
 * "Descobrir": jobs found by the user's saved searches. Desktop: list + detail side by side
 * (the selected job lives in the URL: ?job=<id>). Mobile: list, and the detail full screen.
 */
export function DiscoverView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('job')
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const now = useNow(60_000)
  const { data, isPending, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useDiscover()
  const jobs = data?.pages.flatMap((page) => page.items) ?? []
  const firstId = jobs[0]?.id

  // Desktop: open the first job when nothing is selected yet.
  useEffect(() => {
    if (isDesktop && !selectedId && firstId) {
      router.replace(`/discover?job=${firstId}`, { scroll: false })
    }
  }, [isDesktop, selectedId, firstId, router])

  if (!isDesktop && selectedId) {
    return (
      <div className="mx-auto grid max-w-3xl gap-6">
        <div>
          <Link
            href="/discover"
            scroll={false}
            className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Descobrir
          </Link>
        </div>
        <DetailPanel id={selectedId} />
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-balance font-semibold text-2xl tracking-tight">Descobrir</h1>
          <p className="text-muted-foreground text-sm">Vagas que as suas buscas encontraram.</p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/searches" />} nativeButton={false}>
          <Search aria-hidden="true" />
          Buscas
        </Button>
      </div>

      {isPending ? (
        <ListSkeleton />
      ) : isError ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">Não foi possível carregar as vagas.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(320px,2fr)_minmax(0,3fr)]">
          {/* min-w-0: grid items default to their content width, so long titles would overflow. */}
          <div
            className={`grid min-w-0 content-start gap-3 lg:overflow-y-auto lg:pr-2 ${COLUMN_HEIGHT}`}
          >
            <ul className="grid min-w-0 gap-3" aria-label="Vagas encontradas">
              {jobs.map((job) => (
                <li key={job.id} className="min-w-0">
                  <DiscoverItem job={job} selected={isDesktop && job.id === selectedId} now={now} />
                </li>
              ))}
            </ul>
            {hasNextPage ? (
              <Button
                variant="outline"
                className="justify-self-center"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
              </Button>
            ) : null}
          </div>

          {isDesktop ? (
            <section
              aria-label="Vaga selecionada"
              className={`min-w-0 overflow-y-auto rounded-xl border bg-background p-6 ${COLUMN_HEIGHT}`}
            >
              {selectedId ? <DetailPanel id={selectedId} /> : <JobDetailSkeleton />}
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}

function DetailPanel({ id }: { id: string }) {
  const { data: job, isPending, isError } = useJob(id)
  if (isPending) return <JobDetailSkeleton />
  if (isError) {
    return (
      <p className="text-muted-foreground text-sm">
        Não foi possível abrir esta vaga. Ela pode ter saído das suas buscas.
      </p>
    )
  }
  // Removing from "Minhas vagas" keeps the job here (a search found it): stay on the panel.
  return <JobDetail job={job} onRemoved={() => undefined} />
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
      <div className="rounded-full bg-muted p-3">
        <Telescope className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="mt-4 font-medium">Nenhuma vaga encontrada ainda</h2>
      <p className="mt-1 max-w-sm text-muted-foreground text-sm">
        Crie uma busca (por exemplo, vagas de backend da comunidade no GitHub) e rode-a para as
        vagas aparecerem aqui.
      </p>
      <Button className="mt-5" render={<Link href="/searches" />} nativeButton={false}>
        <Search aria-hidden="true" />
        Ir para Buscas
      </Button>
    </div>
  )
}

function ListSkeleton() {
  return (
    <ul className="grid gap-3 lg:max-w-[40%]" aria-busy="true" aria-label="Carregando vagas">
      {[0, 1, 2, 3].map((item) => (
        <li key={item} className="rounded-xl border p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/3" />
          <Skeleton className="mt-3 h-3 w-1/2" />
        </li>
      ))}
    </ul>
  )
}
