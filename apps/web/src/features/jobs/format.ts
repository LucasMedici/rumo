import type { EmploymentType, JobSummary, SalaryPeriod, Seniority, WorkMode } from '@rumo/contracts'

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: 'Remoto',
  hybrid: 'Híbrido',
  onsite: 'Presencial',
}

export const SENIORITY_LABELS: Record<Seniority, string> = {
  intern: 'Estágio',
  junior: 'Júnior',
  mid: 'Pleno',
  senior: 'Sênior',
  staff: 'Especialista / Staff',
  principal: 'Principal',
  lead: 'Liderança técnica',
  manager: 'Gestão',
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'CLT / Tempo integral',
  part_time: 'Meio período',
  contract: 'PJ / Contrato',
  internship: 'Estágio',
  temporary: 'Temporário',
  freelance: 'Freelance',
}

export const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string> = {
  hour: 'por hora',
  day: 'por dia',
  month: 'por mês',
  year: 'por ano',
}

const SALARY_PERIOD_SHORT: Record<SalaryPeriod, string> = {
  hour: '/h',
  day: '/dia',
  month: '/mês',
  year: '/ano',
}

/** Currencies offered in the form (any ISO 4217 code is accepted by the API). */
export const CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP', 'CAD'] as const

/** Countries offered in the form, most relevant first (any ISO 3166-1 code is accepted by the API). */
export const COUNTRIES = [
  'BR',
  'US',
  'CA',
  'GB',
  'IE',
  'PT',
  'ES',
  'DE',
  'NL',
  'FR',
  'CH',
  'SE',
  'DK',
  'PL',
  'AR',
  'MX',
  'CL',
  'CO',
  'AU',
  'NZ',
  'JP',
  'SG',
  'AE',
  'IL',
] as const

const regionNames = new Intl.DisplayNames(['pt-BR'], { type: 'region' })

export function countryName(code: string): string {
  return regionNames.of(code) ?? code
}

export function formatSalary(salary: NonNullable<JobSummary['salary']>): string {
  const money = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: salary.currency,
    maximumFractionDigits: 0,
  })
  const amount =
    salary.min != null && salary.max != null && salary.min !== salary.max
      ? `${money.format(salary.min)} – ${money.format(salary.max)}`
      : salary.min != null
        ? `${salary.max == null ? 'a partir de ' : ''}${money.format(salary.min)}`
        : `até ${money.format(salary.max ?? 0)}`
  return `${amount}${SALARY_PERIOD_SHORT[salary.period]}`
}

/** "Remoto · Estados Unidos" style location line. */
export function formatLocation(job: Pick<JobSummary, 'workMode' | 'locationText' | 'countryCode'>) {
  return [
    job.workMode ? WORK_MODE_LABELS[job.workMode] : null,
    job.locationText,
    job.countryCode ? countryName(job.countryCode) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

const relativeTime = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

/** "hoje", "ontem", "há 3 dias", "há 2 meses"... */
export function formatRelativeDate(iso: string, now = new Date()): string {
  const days = Math.round((new Date(iso).getTime() - now.getTime()) / 86_400_000)
  if (Math.abs(days) < 7) return relativeTime.format(days, 'day')
  if (Math.abs(days) < 30) return relativeTime.format(Math.round(days / 7), 'week')
  if (Math.abs(days) < 365) return relativeTime.format(Math.round(days / 30), 'month')
  return relativeTime.format(Math.round(days / 365), 'year')
}

/** "Adicionada há 2 dias" (in the user's list) or "Encontrada ontem" (found by a saved search). */
export function jobDateLabel(job: Pick<JobSummary, 'addedAt' | 'foundAt'>, now = new Date()) {
  if (job.addedAt) return `Adicionada ${formatRelativeDate(job.addedAt, now)}`
  if (job.foundAt) return `Encontrada ${formatRelativeDate(job.foundAt, now)}`
  return null
}
