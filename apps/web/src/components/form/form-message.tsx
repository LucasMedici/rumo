import { CircleAlert, CircleCheck } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) {
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  if (success) {
    return (
      <Alert>
        <CircleCheck />
        <AlertDescription>{success}</AlertDescription>
      </Alert>
    )
  }
  return null
}
