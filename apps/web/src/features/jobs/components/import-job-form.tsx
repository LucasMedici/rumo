'use client'

import { useRouter } from 'next/navigation'
import { useImportJob } from '../api'
import { JobForm } from './job-form'

export function ImportJobForm() {
  const router = useRouter()
  const importJob = useImportJob()

  return (
    <JobForm
      submitLabel="Importar vaga"
      pendingLabel="Importando…"
      cancelHref="/jobs"
      onSubmit={async (input) => {
        const job = await importJob.mutateAsync(input)
        router.push(`/jobs/${job.id}`)
      }}
    />
  )
}
