'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { signIn } from '../actions'
import { initialFormState } from '../form-state'
import { FormField } from './form-field'
import { FormMessage } from './form-message'

const LINK_ERROR = 'O link expirou ou já foi usado. Entre novamente ou peça um novo link.'

export function LoginForm() {
  const searchParams = useSearchParams()
  const [state, formAction, pending] = useActionState(signIn, initialFormState)
  const linkError = searchParams.get('error') === 'link' ? LINK_ERROR : undefined

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <FormMessage error={state.error ?? linkError} />
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
