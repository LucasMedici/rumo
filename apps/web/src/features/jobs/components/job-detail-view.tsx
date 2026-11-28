'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api-client'
import { useJob } from '../api'
import { JobDetail } from './job-detail'

/** Job page (/jobs/[id]): back link + full detail. */
export function JobDetailView() {
  const { id } = useParams<{ id: string }>()
  const { data: job, isPending, error } = useJob(id)

  if (isPending) return <JobDetailSkeleton />

  if (error) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400)
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <h1 className="font-medium">{notFound ? 'Vaga não encontrada' : 'Algo deu errado'}</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {notFound
            ? 'Ela pode ter sido removida da sua lista ou a busca que a encontrou foi excluída.'
            : 'Não foi possível carregar a vaga agora.'}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          render={<Link href="/jobs" />}
          nativeButton={false}
        >
          Voltar para Minhas vagas
        </Button>
      </div>
    )
  }

  const back = job.inList
    ? { href: '/jobs', label: 'Minhas vagas' }
    : { href: '/discover', label: 'Descobrir' }

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {back.label}
        </Link>
      </div>
      <JobDetail job={job} />
    </div>
  )
}

export function JobDetailSkeleton() {
  return (
    <div className="grid gap-6" role="status" aria-busy="true" aria-label="Carregando vaga">
      <div>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-2 h-5 w-1/3" />
      </div>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
