import type { z } from 'zod'

/** State returned by auth Server Actions to `useActionState`. */
export type FormState = {
  /** General error shown above the form. */
  error?: string
  /** Per-field validation errors. */
  fieldErrors?: Record<string, string[] | undefined>
  /** Success message (e.g. "check your inbox"). */
  success?: string
  /** Submitted values, to refill the form after an error (never includes passwords). */
  values?: Record<string, string>
}

export const initialFormState: FormState = {}

export function validationErrors(error: z.ZodError): FormState {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
  }
  return { fieldErrors }
}

/** Translates Supabase Auth errors into messages for the user. */
export function authErrorMessage(error: { code?: string; message: string }): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.'
    case 'email_not_confirmed':
      return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'
    case 'weak_password':
      return 'Essa senha é muito fraca. Use uma senha mais longa e menos previsível.'
    case 'same_password':
      return 'A nova senha precisa ser diferente da atual.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.'
    default:
      return 'Não foi possível concluir agora. Tente novamente em instantes.'
  }
}
