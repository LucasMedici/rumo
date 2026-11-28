import type { JobSummary } from '@rumo/contracts'
import { Building2, MapPin, Wallet } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatLocation, formatSalary, jobDateLabel, SENIORITY_LABELS } from '../format'

export function JobCard({ job }: { job: JobSummary }) {
  const location = formatLocation(job)

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group block rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-medium group-hover:underline group-hover:underline-offset-4">
            {job.title}
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground text-sm">
            <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{job.company.name}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {job.status === 'closed' ? <Badge variant="outline">Encerrada</Badge> : null}
          {job.seniority ? (
            <Badge variant="secondary">{SENIORITY_LABELS[job.seniority]}</Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-sm">
        {location ? (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            {location}
          </span>
        ) : null}
        {job.salary ? (
          <span className="flex items-center gap-1.5">
            <Wallet className="size-3.5 shrink-0" aria-hidden="true" />
            {formatSalary(job.salary)}
          </span>
        ) : null}
        <span className="ml-auto text-xs">{jobDateLabel(job)}</span>
      </div>
    </Link>
  )
}
