'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useRemoveJob } from '../api'

export function RemoveJobButton({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const router = useRouter()
  const removeJob = useRemoveJob(jobId)

  async function handleRemove() {
    await removeJob.mutateAsync()
    router.push('/jobs')
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <Trash2 aria-hidden="true" />
        Remover
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover vaga da sua lista?</AlertDialogTitle>
          <AlertDialogDescription>
            “{jobTitle}” deixa de aparecer em Minhas vagas. Você pode importá-la de novo depois.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {removeJob.isError ? (
          <p className="text-destructive text-sm">Não foi possível remover agora. Tente de novo.</p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleRemove}
            disabled={removeJob.isPending}
          >
            {removeJob.isPending ? 'Removendo…' : 'Remover'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
