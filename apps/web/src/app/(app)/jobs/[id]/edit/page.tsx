import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EditJobForm } from '@/features/jobs/components/edit-job-form'

export const metadata: Metadata = { title: 'Editar vaga · Rumo' }

export default function EditJobPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <h1 className="font-semibold text-2xl tracking-tight">Editar vaga</h1>
      {/* EditJobForm reads the job id from the URL (request-time data). */}
      <Suspense>
        <EditJobForm />
      </Suspense>
    </div>
  )
}
