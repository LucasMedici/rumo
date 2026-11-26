'use server'

import { redirect } from 'next/navigation'
import { publicEnv } from '@/lib/env'
import { HOME_ROUTE, safeNextPath } from '@/lib/routes'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { authErrorMessage, type FormState, validationErrors } from './form-state'
import {
  forgotPasswordSchema,
  oauthProviderSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from './schemas'

const callbackUrl = (next: string) =>
  `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData))
  const values = { email: String(formData.get('email') ?? '') }
  if (!parsed.success) return { ...validationErrors(parsed.error), values }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: authErrorMessage(error), values }

  redirect(safeNextPath(formData.get('next')?.toString()))
}

/** Starts the OAuth flow; the provider sends the user back to /auth/callback. */
export async function signInWithProvider(formData: FormData) {
  const provider = oauthProviderSchema.safeParse(formData.get('provider'))
  if (!provider.success) redirect('/login?error=oauth')

  const next = safeNextPath(formData.get('next')?.toString())
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider.data,
    options: { redirectTo: callbackUrl(next) },
  })
  if (error || !data.url) redirect('/login?error=oauth')

  redirect(data.url)
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData))
  const values = {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
  }
  if (!parsed.success) return { ...validationErrors(parsed.error), values }

  const { name, email, password } = parsed.data
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name }, emailRedirectTo: callbackUrl(HOME_ROUTE) },
  })
  if (error) return { error: authErrorMessage(error), values }

  // Same message whether or not the e-mail already exists (avoids account enumeration).
  return {
    success: `Enviamos um link de confirmação para ${email}. Abra o e-mail para ativar sua conta.`,
  }
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationErrors(parsed.error)

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl('/reset-password'),
  })
  if (error?.code?.startsWith('over_')) return { error: authErrorMessage(error) }

  // Same message whether or not the e-mail exists (avoids account enumeration).
  return {
    success:
      'Se houver uma conta com esse e-mail, você vai receber um link para criar uma nova senha.',
  }
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationErrors(parsed.error)

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: authErrorMessage(error) }

  redirect(HOME_ROUTE)
}

export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
