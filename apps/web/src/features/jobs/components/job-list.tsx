'use client'

import { Briefcase, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useJobs } from '../api'
import { JobCard } from './job-card'

export function JobList() {
  const { data, isPending, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useJobs()

  if (isPending) return <JobListSkeleton />

  if (isError) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-muted-foreground text-sm">Não foi possível carregar suas vagas.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          Tentar de novo
        </Button>
      </div>
    )
  }

  const jobs = data.pages.flatMap((page) => page.items)

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
        <div className="rounded-full bg-muted p-3">
          <Briefcase className="size-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="mt-4 font-medium">Nenhuma vaga por aqui ainda</h2>
        <p className="mt-1 max-w-sm text-muted-foreground text-sm">
          Encontrou uma vaga interessante no LinkedIn, na Gupy ou em qualquer site? Importe para
          organizar tudo em um só lugar.
        </p>
        <Button className="mt-5" render={<Link href="/jobs/new" />} nativeButton={false}>
          <Plus aria-hidden="true" />
          Importar primeira vaga
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <ul className="grid gap-3">
        {jobs.map((job) => (
          <li key={job.id}>
            <JobCard job={job} />
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
  )
}

function JobListSkeleton() {
  return (
    <ul className="grid gap-3" aria-busy="true" aria-label="Carregando vagas">
      {[0, 1, 2].map((item) => (
        <li key={item} className="rounded-xl border p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/3" />
          <Skeleton className="mt-4 h-4 w-1/2" />
        </li>
      ))}
    </ul>
  )
}
