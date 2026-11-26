'use client'

import { useActionState } from 'react'
import { FormField } from '@/components/form/form-field'
import { FormMessage } from '@/components/form/form-message'
import { Button } from '@/components/ui/button'
import { updatePassword } from '../actions'
import { initialFormState } from '../form-state'
import { PASSWORD_MIN_LENGTH } from '../schemas'

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialFormState)

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage error={state.error} />
      <FormField
        name="password"
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        hint={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres.`}
        errors={state.fieldErrors?.password}
      />
      <FormField
        name="confirmPassword"
        label="Confirme a nova senha"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirmPassword}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Salvando…' : 'Salvar nova senha'}
      </Button>
    </form>
  )
}
