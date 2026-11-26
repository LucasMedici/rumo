'use client'

import { useActionState } from 'react'
import { FormField } from '@/components/form/form-field'
import { FormMessage } from '@/components/form/form-message'
import { Button } from '@/components/ui/button'
import { requestPasswordReset } from '../actions'
import { initialFormState } from '../form-state'

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialFormState)

  if (state.success) return <FormMessage success={state.success} />

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage error={state.error} />
      <FormField
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        required
        errors={state.fieldErrors?.email}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar link'}
      </Button>
    </form>
  )
}
