'use client'

import type { JobDetail as JobDetailData } from '@rumo/contracts'
import { Bookmark, ExternalLink, Pencil } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSaveJob } from '../api'
import {
  countryName,
  EMPLOYMENT_TYPE_LABELS,
  formatSalary,
  jobDateLabel,
  meaningfulLocation,
  SENIORITY_LABELS,
  sourceLabel,
  WORK_MODE_LABELS,
} from '../format'
import { RemoveJobButton } from './remove-job-button'

type Props = {
  job: JobDetailData
  /** Called after "remove from list"; by default goes to "Minhas vagas". */
  onRemoved?: () => void
}

/** Full job content + actions. Used by the job page and by the "Descobrir" side panel. */
export function JobDetail({ job, onRemoved }: Props) {
  const facts = [
    ['Modalidade', job.workMode && WORK_MODE_LABELS[job.workMode]],
    ['Senioridade', job.seniority && SENIORITY_LABELS[job.seniority]],
    ['Contrato', job.employmentType && EMPLOYMENT_TYPE_LABELS[job.employmentType]],
    ['Salário', job.salary && formatSalary(job.salary)],
    ['Localização', meaningfulLocation(job)],
    ['País', job.countryCode && countryName(job.countryCode)],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]))

  // Attribution: link to every external source the job came from (required by their terms).
  const sourceLinks = job.sources.filter((source) => source.key !== 'manual' && source.url)

  return (
    <article className="grid gap-6">
      <header className="grid gap-4">
        <div className="min-w-0">
          <h1 className="text-balance font-semibold text-2xl tracking-tight">{job.title}</h1>
          <p className="mt-1 text-lg text-muted-foreground">{job.company.name}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {job.status === 'closed' ? <Badge variant="outline">Encerrada</Badge> : null}
            {job.sources.map((source) => (
              <Badge key={source.key} variant="secondary">
                {sourceLabel(source)}
              </Badge>
            ))}
            <span className="text-muted-foreground text-xs">{jobDateLabel(job)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {job.applyUrl ? (
            <Button
              render={<a href={job.applyUrl} target="_blank" rel="noopener noreferrer" />}
              nativeButton={false}
            >
              Candidatar-se
              <ExternalLink aria-hidden="true" />
            </Button>
          ) : null}
          {job.inList ? (
            <RemoveJobButton jobId={job.id} jobTitle={job.title} onRemoved={onRemoved} />
          ) : (
            <SaveJobButton jobId={job.id} />
          )}
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
        </div>

        {sourceLinks.length > 0 ? (
          <p className="text-muted-foreground text-sm">
            Fonte:{' '}
            {sourceLinks.map((source, index) => (
              <span key={source.key}>
                {index > 0 ? ' · ' : null}
                <a
                  href={source.url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4"
                >
                  ver no {source.key === 'github-issues' ? 'GitHub' : source.name}
                </a>
              </span>
            ))}
          </p>
        ) : null}
      </header>

      {facts.length > 0 ? (
        <Card>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="mt-1 text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <section aria-labelledby={`job-description-${job.id}`}>
        <h2 id={`job-description-${job.id}`} className="mb-3 font-medium">
          Descrição
        </h2>
        {/* Plain text rendered by React (escaped): no source can inject HTML or scripts. */}
        <div className="whitespace-pre-wrap break-words rounded-xl border bg-card p-5 text-pretty text-sm leading-relaxed">
          {job.description}
        </div>
      </section>
    </article>
  )
}

function SaveJobButton({ jobId }: { jobId: string }) {
  const saveJob = useSaveJob(jobId)
  return (
    <Button variant="outline" onClick={() => saveJob.mutate()} disabled={saveJob.isPending}>
      <Bookmark aria-hidden="true" />
      {saveJob.isPending ? 'Salvando…' : 'Salvar'}
    </Button>
  )
}
