'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useActionState } from 'react'
import { FormField } from '@/components/form/form-field'
import { FormMessage } from '@/components/form/form-message'
import { Button } from '@/components/ui/button'
import { signIn } from '../actions'
import { initialFormState } from '../form-state'

const URL_ERRORS: Record<string, string> = {
  link: 'O link expirou ou já foi usado. Entre novamente ou peça um novo link.',
  oauth: 'Não foi possível entrar com essa conta agora. Tente novamente ou use e-mail e senha.',
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const [state, formAction, pending] = useActionState(signIn, initialFormState)
  const urlError = URL_ERRORS[searchParams.get('error') ?? '']

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage error={state.error ?? urlError} />
      <input type="hidden" name="next" value={searchParams.get('next') ?? ''} />
      <FormField
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <div className="grid gap-2">
        <FormField
          name="password"
          label="Senha"
          type="password"
          autoComplete="current-password"
          required
          errors={state.fieldErrors?.password}
        />
        <Link
          href="/forgot-password"
          className="justify-self-end text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
