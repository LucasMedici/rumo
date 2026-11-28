'use client'

import { ArrowLeft, ExternalLink, Pencil } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api-client'
import { useJob } from '../api'
import {
  countryName,
  EMPLOYMENT_TYPE_LABELS,
  formatSalary,
  jobDateLabel,
  SENIORITY_LABELS,
  WORK_MODE_LABELS,
} from '../format'
import { RemoveJobButton } from './remove-job-button'

export function JobDetailView() {
  const { id } = useParams<{ id: string }>()
  const { data: job, isPending, error } = useJob(id)

  if (isPending) return <DetailSkeleton />

  if (error) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400)
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <h1 className="font-medium">{notFound ? 'Vaga não encontrada' : 'Algo deu errado'}</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {notFound
            ? 'Ela pode ter sido removida da sua lista.'
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

  const facts = [
    ['Modalidade', job.workMode && WORK_MODE_LABELS[job.workMode]],
    ['Senioridade', job.seniority && SENIORITY_LABELS[job.seniority]],
    ['Contrato', job.employmentType && EMPLOYMENT_TYPE_LABELS[job.employmentType]],
    ['Salário', job.salary && formatSalary(job.salary)],
    ['Localização', job.locationText],
    ['País', job.countryCode && countryName(job.countryCode)],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]))

  return (
    <article className="grid gap-6">
      <div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Minhas vagas
        </Link>
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-semibold text-2xl tracking-tight">{job.title}</h1>
          <p className="mt-1 text-lg text-muted-foreground">{job.company.name}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {job.status === 'closed' ? <Badge variant="outline">Encerrada</Badge> : null}
            {job.sources.map((source) => (
              <Badge key={source.key} variant="secondary">
                {source.key === 'manual' ? 'Importada por você' : source.name}
              </Badge>
            ))}
            <span className="text-muted-foreground text-xs">{jobDateLabel(job)}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {job.applyUrl ? (
            <Button
              render={<a href={job.applyUrl} target="_blank" rel="noopener noreferrer" />}
              nativeButton={false}
            >
              Ver vaga original
              <ExternalLink aria-hidden="true" />
            </Button>
          ) : null}
          {job.editable ? (
            <Button
              variant="outline"
              render={<Link href={`/jobs/${job.id}/edit`} />}
              nativeButton={false}
            >
              <Pencil aria-hidden="true" />
              Editar
            </Button>
          ) : null}
          <RemoveJobButton jobId={job.id} jobTitle={job.title} />
        </div>
      </header>

      {facts.length > 0 ? (
        <Card>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wide">{label}</dt>
                  <dd className="mt-1 text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <section aria-labelledby="job-description">
        <h2 id="job-description" className="mb-3 font-medium">
          Descrição
        </h2>
        {/* Plain text rendered by React (escaped): pasted content can never inject HTML/scripts. */}
        <div className="whitespace-pre-wrap break-words rounded-xl border bg-card p-5 text-sm leading-relaxed">
          {job.description}
        </div>
      </section>
    </article>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6" role="status" aria-busy="true" aria-label="Carregando vaga">
      <Skeleton className="h-4 w-24" />
      <div>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-2 h-5 w-1/3" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
