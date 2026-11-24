import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthCard } from '@/features/auth/components/auth-card'
import { SignupForm } from '@/features/auth/components/signup-form'

export const metadata: Metadata = { title: 'Criar conta · Rumo' }

export default function SignupPage() {
  return (
    <AuthCard
      title="Criar conta"
      description="Comece a organizar sua busca por vagas."
      footer={
        <>
          Já tem conta?{' '}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Entrar
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  )
}
