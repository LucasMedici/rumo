'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useJob, useUpdateJob } from '../api'
import { JobForm } from './job-form'

export function EditJobForm() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: job, isPending, isError } = useJob(id)
  const updateJob = useUpdateJob(id)

  if (isPending) return <Skeleton className="h-96 w-full" />

  if (isError || !job.editable) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <p className="text-muted-foreground text-sm">
          {isError ? 'Vaga não encontrada.' : 'Só é possível editar vagas que você importou.'}
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

  return (
    <JobForm
      job={job}
      submitLabel="Salvar alterações"
      pendingLabel="Salvando…"
      cancelHref={`/jobs/${id}`}
      onSubmit={async (input) => {
        await updateJob.mutateAsync(input)
        router.push(`/jobs/${id}`)
      }}
    />
  )
}
