'use client'

import { useSearchParams } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { signInWithProvider } from '../actions'
import type { OAuthProvider } from '../schemas'
import { GitHubIcon, GoogleIcon } from './provider-icons'

const PROVIDERS: { id: OAuthProvider; label: string; Icon: typeof GitHubIcon }[] = [
  { id: 'google', label: 'Google', Icon: GoogleIcon },
  { id: 'github', label: 'GitHub', Icon: GitHubIcon },
]

/** "Continue with Google / GitHub" buttons; both submit the same Server Action. */
export function OAuthButtons() {
  const searchParams = useSearchParams()

  return (
    <form action={signInWithProvider} className="grid gap-2">
      <input type="hidden" name="next" value={searchParams.get('next') ?? ''} />
      {PROVIDERS.map((provider) => (
        <ProviderButton key={provider.id} {...provider} />
      ))}
    </form>
  )
}

function ProviderButton({ id, label, Icon }: (typeof PROVIDERS)[number]) {
  const { pending, data } = useFormStatus()
  const isThisOne = pending && data?.get('provider') === id

  return (
    <Button type="submit" name="provider" value={id} variant="outline" size="lg" disabled={pending}>
      <Icon />
      {isThisOne ? 'Redirecionando…' : `Continuar com ${label}`}
    </Button>
  )
}
