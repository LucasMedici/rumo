'use client'

import type { JobSummary } from '@rumo/contracts'
import { Bookmark, BookmarkCheck, MapPin, Wallet } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRemoveJob, useSaveJob } from '@/features/jobs/api'
import {
  formatLocation,
  formatSalary,
  isNewDiscovery,
  jobDateLabel,
  SENIORITY_LABELS,
  sourceLabel,
} from '@/features/jobs/format'
import { cn } from '@/lib/utils'

type Props = { job: JobSummary; selected: boolean; now: Date }

/**
 * Compact, selectable job card. The whole card is a link (stretched over the card), and the
 * quick-save button sits above it — never nested inside the link (invalid HTML, confusing for
 * screen readers).
 */
export function DiscoverItem({ job, selected, now }: Props) {
  const location = formatLocation(job)
  const isNew = isNewDiscovery(job, now)
  const sources = job.sources.filter((source) => source.key !== 'manual')

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20',
        selected && 'border-primary/60 bg-accent/40 hover:border-primary/60',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 pr-10">
          <div className="flex items-center gap-2">
            {isNew ? (
              <span className="shrink-0 rounded-full bg-highlight px-1.5 font-medium text-[11px] text-highlight-foreground">
                Nova
              </span>
            ) : null}
            <h2 className="truncate font-medium">
              <Link
                href={`/discover?job=${job.id}`}
                scroll={false}
                aria-current={selected ? 'true' : undefined}
                className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
              >
                {job.title}
              </Link>
            </h2>
          </div>
          <p className="mt-0.5 truncate text-muted-foreground text-sm">{job.company.name}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
        {job.seniority ? (
          <Badge variant="secondary">{SENIORITY_LABELS[job.seniority]}</Badge>
        ) : null}
        {location ? (
          <span className="flex items-center gap-1">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            {location}
          </span>
        ) : null}
        {job.salary ? (
          <span className="flex items-center gap-1 tabular-nums">
            <Wallet className="size-3 shrink-0" aria-hidden="true" />
            {formatSalary(job.salary)}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
        {sources.map((source) => (
          <span key={source.key}>{sourceLabel(source)}</span>
        ))}
        <span aria-hidden="true">·</span>
        <span>{jobDateLabel(job)}</span>
      </div>

      <QuickSave job={job} />
    </div>
  )
}

function QuickSave({ job }: { job: JobSummary }) {
  const saveJob = useSaveJob(job.id)
  const removeJob = useRemoveJob(job.id)
  const pending = saveJob.isPending || removeJob.isPending

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(
        'absolute top-3 right-3 z-10',
        job.inList ? 'text-primary' : 'text-muted-foreground',
      )}
      onClick={() => (job.inList ? removeJob.mutate() : saveJob.mutate())}
      disabled={pending}
      aria-pressed={job.inList}
      aria-label={job.inList ? `Remover “${job.title}” de Minhas vagas` : `Salvar “${job.title}”`}
    >
      {job.inList ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
    </Button>
  )
}
