import type { z } from 'zod'

export type FieldErrors = Record<string, string[] | undefined>

/** pt-BR messages per field and issue code; the shared schemas speak English. */
const MESSAGES: Record<string, Partial<Record<string, string>> & { default: string }> = {
  title: {
    too_small: 'Informe o cargo.',
    too_big: 'Cargo muito longo.',
    default: 'Cargo inválido.',
  },
  companyName: {
    too_small: 'Informe a empresa.',
    too_big: 'Nome muito longo.',
    default: 'Empresa inválida.',
  },
  description: {
    too_small: 'Cole a descrição da vaga (pelo menos 20 caracteres).',
    too_big: 'Descrição muito longa (máximo de 50 mil caracteres).',
    default: 'Descrição inválida.',
  },
  applyUrl: { default: 'Informe um link válido, começando com http:// ou https://.' },
  locationText: { default: 'Localização muito longa.' },
  countryCode: { default: 'País inválido.' },
  salaryMin: {
    too_small: 'O salário não pode ser negativo.',
    default: 'Informe um número inteiro, sem centavos.',
  },
  salaryMax: {
    custom: 'O máximo precisa ser maior ou igual ao mínimo.',
    too_small: 'O salário não pode ser negativo.',
    default: 'Informe um número inteiro, sem centavos.',
  },
  salaryCurrency: { custom: 'Escolha a moeda do salário.', default: 'Moeda inválida.' },
  salaryPeriod: { custom: 'Escolha o período do salário.', default: 'Período inválido.' },
}

function messageFor(field: string, code: string): string {
  const messages = MESSAGES[field]
  return messages?.[code] ?? messages?.default ?? 'Valor inválido.'
}

/** Client-side validation errors (from the shared Zod schema). */
export function fieldErrorsFromZod(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form')
    errors[field] ??= [messageFor(field, issue.code)]
  }
  return errors
}

/** Server-side validation errors (`details: [{ path: '/title', message }]`). */
export function fieldErrorsFromApi(details: unknown): FieldErrors | null {
  if (!Array.isArray(details)) return null
  const errors: FieldErrors = {}
  for (const detail of details) {
    const path = typeof detail?.path === 'string' ? detail.path : ''
    const field = path.split('/').filter(Boolean)[0]
    if (field) errors[field] ??= [messageFor(field, 'default')]
  }
  return Object.keys(errors).length > 0 ? errors : null
}
