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

type Props = {
  jobId: string
  jobTitle: string
  /** Called after removal; by default goes back to "Minhas vagas". */
  onRemoved?: () => void
}

export function RemoveJobButton({ jobId, jobTitle, onRemoved }: Props) {
  const router = useRouter()
  const removeJob = useRemoveJob(jobId)

  async function handleRemove() {
    await removeJob.mutateAsync()
    if (onRemoved) onRemoved()
    else router.push('/jobs')
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <Trash2 aria-hidden="true" />
        Remover da lista
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover vaga da sua lista?</AlertDialogTitle>
          <AlertDialogDescription>
            “{jobTitle}” deixa de aparecer em Minhas vagas. Se uma busca sua a encontrou, ela
            continua em Descobrir.
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
