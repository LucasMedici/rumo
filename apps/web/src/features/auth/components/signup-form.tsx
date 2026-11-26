'use client'

import { useActionState } from 'react'
import { FormField } from '@/components/form/form-field'
import { FormMessage } from '@/components/form/form-message'
import { Button } from '@/components/ui/button'
import { signUp } from '../actions'
import { initialFormState } from '../form-state'
import { PASSWORD_MIN_LENGTH } from '../schemas'

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initialFormState)

  if (state.success) return <FormMessage success={state.success} />

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage error={state.error} />
      <FormField
        name="name"
        label="Nome"
        autoComplete="name"
        required
        defaultValue={state.values?.name}
        errors={state.fieldErrors?.name}
      />
      <FormField
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <FormField
        name="password"
        label="Senha"
        type="password"
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        hint={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres.`}
        errors={state.fieldErrors?.password}
      />
      <FormField
        name="confirmPassword"
        label="Confirme a senha"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirmPassword}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Criando conta…' : 'Criar conta'}
      </Button>
    </form>
  )
}
