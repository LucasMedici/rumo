import type { Metadata } from 'next'
import { AuthCard } from '@/features/auth/components/auth-card'
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form'

export const metadata: Metadata = { title: 'Nova senha · Rumo' }

/** Reached through the recovery e-mail link (the callback creates the session first). */
export default function ResetPasswordPage() {
  return (
    <AuthCard title="Criar nova senha" description="Escolha uma senha nova para sua conta.">
      <ResetPasswordForm />
    </AuthCard>
  )
}
