import type { SalaryPeriod } from '@rumo/contracts'

export type ParsedSalary = {
  min: number | null
  max: number | null
  currency: string
  period: SalaryPeriod
}

const CURRENCY_SYMBOLS: [RegExp, string][] = [
  [/R\$/i, 'BRL'],
  [/€/, 'EUR'],
  [/£/, 'GBP'],
  [/\b(USD|EUR|GBP|BRL|CAD|AUD)\b/i, ''], // ISO code written out (resolved below)
  [/\$/, 'USD'], // a bare "$" is assumed to be USD (sources are mostly US/international)
]

// Note: no `\b` before "/" — a space followed by "/" is not a word boundary ("$50 /hour").
const PERIOD_PATTERNS: [RegExp, SalaryPeriod][] = [
  [/\bper\s+hour\b|\bhourly\b|\/\s*(?:hour|hr|h)\b|\bhora\b/i, 'hour'],
  [/\bper\s+day\b|\bdaily\b|\/\s*day\b|\bdia\b/i, 'day'],
  [/\bper\s+month\b|\bmonthly\b|\/\s*(?:month|mo)\b|\bm[eê]s\b|\bmensal\b/i, 'month'],
  [
    /\bper\s+(?:year|annum)\b|\byearly\b|\bannual(?:ly)?\b|\/\s*(?:year|yr)\b|\bano\b|\banual\b/i,
    'year',
  ],
]

/** Amounts like "57K", "35,3k", "80,000", "3.5k", "120000". */
const AMOUNT = /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d{1,2})?)\s*([kK])?/g

/**
 * Best-effort, conservative parser for free-text salaries ("$57K - $67K", "$14/hour",
 * "$3.5k–$5k/month"). Returns null when the currency or the period can't be determined
 * reliably — a missing salary is better than a wrong one.
 */
export function parseSalaryText(text: string | null | undefined): ParsedSalary | null {
  if (!text?.trim()) return null

  // Only the first sentence: later sentences carry other numbers ("R$ 72,50 por hora. Até 36
  // horas semanais..." must not become a 36–72 range).
  const sentence = firstSentence(text)
  const currency = detectCurrency(sentence)
  if (!currency) return null

  const amounts = [...sentence.matchAll(AMOUNT)]
    .map(([, number = '', thousands]) => toNumber(number) * (thousands ? 1000 : 1))
    .filter((value) => Number.isFinite(value) && value > 0)
    .slice(0, 2)
  const [first, second] = amounts
  if (first === undefined) return null

  const min = Math.round(second === undefined ? first : Math.min(first, second))
  const max = second === undefined ? null : Math.round(Math.max(first, second))

  const period = detectPeriod(sentence) ?? (min >= 15_000 ? 'year' : null)
  if (!period) return null

  return { min, max, currency, period }
}

function detectCurrency(text: string): string | null {
  for (const [pattern, code] of CURRENCY_SYMBOLS) {
    const match = text.match(pattern)
    if (match) return code || (match[1] ?? '').toUpperCase()
  }
  return null
}

function detectPeriod(text: string): SalaryPeriod | null {
  for (const [pattern, period] of PERIOD_PATTERNS) {
    if (pattern.test(text)) return period
  }
  return null
}

/** "80,000" / "80.000" → 80000 (thousands separator); "35,3" / "3.5" → decimal. */
function toNumber(raw: string): number {
  if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) return Number(raw.replace(/[.,]/g, ''))
  return Number(raw.replace(',', '.'))
}

/** First line, cut at the end of the first sentence (". " followed by more text). */
function firstSentence(text: string): string {
  // Markdown emphasis would hide the sentence end ("por hora.** Até...").
  const line =
    text
      .replace(/[*_`]+/g, '')
      .trim()
      .split(/\n/)[0] ?? ''
  return line.split(/\.\s+(?=\S)/)[0] ?? line
}
