import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthCard } from '@/features/auth/components/auth-card'
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form'

export const metadata: Metadata = { title: 'Recuperar senha · Rumo' }

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperar senha"
      description="Enviaremos um link para você criar uma nova senha."
      footer={
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Voltar para o login
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}
