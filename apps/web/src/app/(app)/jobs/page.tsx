import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { JobList } from '@/features/jobs/components/job-list'

export const metadata: Metadata = { title: 'Minhas vagas · Rumo' }

export default function JobsPage() {
  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Minhas vagas</h1>
          <p className="text-muted-foreground text-sm">As vagas que você importou ou salvou.</p>
        </div>
        <Button render={<Link href="/jobs/new" />} nativeButton={false}>
          <Plus aria-hidden="true" />
          Importar vaga
        </Button>
      </div>
      <JobList />
    </div>
  )
}
