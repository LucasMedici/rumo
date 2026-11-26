import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { AuthCard } from '@/features/auth/components/auth-card'
import { LoginForm } from '@/features/auth/components/login-form'
import { OAuthButtons } from '@/features/auth/components/oauth-buttons'
import { OrSeparator } from '@/features/auth/components/or-separator'

export const metadata: Metadata = { title: 'Entrar · Rumo' }

export default function LoginPage() {
  return (
    <AuthCard
      title="Entrar"
      description="Acesse suas vagas e candidaturas."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link href="/signup" className="text-foreground underline underline-offset-4">
            Criar conta
          </Link>
        </>
      }
    >
      {/* These read ?next= and ?error= from the URL, which is request-time data. */}
      <Suspense>
        <div className="grid gap-6">
          <OAuthButtons />
          <OrSeparator />
          <LoginForm />
        </div>
      </Suspense>
    </AuthCard>
  )
}
