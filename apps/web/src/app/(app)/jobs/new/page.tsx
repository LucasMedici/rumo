import type { Metadata } from 'next'
import { ImportJobForm } from '@/features/jobs/components/import-job-form'

export const metadata: Metadata = { title: 'Importar vaga · Rumo' }

export default function NewJobPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Importar vaga</h1>
        <p className="text-muted-foreground text-sm">
          Copie as informações da vaga onde você a encontrou e cole aqui.
        </p>
      </div>
      <ImportJobForm />
    </div>
  )
}
