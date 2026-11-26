import type { Metadata } from 'next'
import { Suspense } from 'react'
import { JobDetailView } from '@/features/jobs/components/job-detail-view'

export const metadata: Metadata = { title: 'Vaga · Rumo' }

export default function JobPage() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* JobDetailView reads the job id from the URL (request-time data). */}
      <Suspense>
        <JobDetailView />
      </Suspense>
    </div>
  )
}
