import type { EmploymentType, Seniority, WorkMode } from '@rumo/contracts'

export type ParsedTitle = {
  title: string
  companyName: string | null
  /** Text of the leading "[...]" prefix, e.g. "Híbrido / São Paulo, Brasil". */
  place: string | null
}

const BR_STATE =
  /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/
/** Last " - segment" values that are a place or work mode, not a company. */
const NOT_A_COMPANY = /^(remoto|remote|h[ií]brido|hybrid|presencial|on-?site|brasil|brazil)$/i
/** Parenthesized endings that describe the job, not the company ("(Node.js + React)"). */
const NOT_A_COMPANY_PAREN =
  /[+,/&]|\.js\b|\b(english|portuguese|spanish|ingl[eê]s|portugu[eê]s|espanhol|candidates|remoto|remote|h[ií]brido|presencial|pj|clt)\b/i

/**
 * Splits a community job title like "[Remoto] Dev Backend Pleno - Mimix AI" into the job title,
 * the company (when the title names it) and the place prefix. Conservative: when unsure, the
 * company stays null (the adapter falls back to the body).
 */
export function parseIssueTitle(raw: string): ParsedTitle {
  let rest = raw.trim().replace(/\s+/g, ' ')
  let place: string | null = null

  const prefix = rest.match(/^\[([^\]]+)\]\s*/)
  if (prefix) {
    place = prefix[1]?.trim() || null
    rest = rest.slice(prefix[0].length)
  }

  rest = balanceParentheses(rest)
  let companyName: string | null = null

  // "... (Strider)"
  const paren = rest.match(/\(([^()]+)\)\s*$/)
  const parenText = paren?.[1]?.trim()
  if (paren && parenText && isCompanyLike(parenText) && !NOT_A_COMPANY_PAREN.test(parenText)) {
    companyName = parenText
    rest = rest.slice(0, paren.index).trim()
  }

  // "... na Google" / "... at Stripe" (company must start with an uppercase letter or a digit)
  if (!companyName) {
    const at = rest.match(/\s(?:na|no|at|@)\s+(\p{Lu}[^\n]*|\d[^\n]*)$/u)
    const atText = at?.[1]?.trim()
    if (at && atText && isCompanyLike(atText)) {
      companyName = atText
      rest = rest.slice(0, at.index).trim()
    }
  }

  // "... - DB1"
  if (!companyName) {
    const parts = rest.split(/\s+[-–—]\s+/)
    const last = parts.at(-1)?.trim()
    if (
      parts.length >= 2 &&
      last &&
      !BR_STATE.test(last) &&
      !NOT_A_COMPANY.test(last) &&
      isCompanyLike(last)
    ) {
      companyName = last
      rest = parts.slice(0, -1).join(' - ')
    }
  }

  const title = rest.replace(/[\s\-–—:]+$/, '').trim()
  return { title: title || raw.trim(), companyName, place }
}

function isCompanyLike(text: string): boolean {
  return text.length >= 2 && text.length <= 60 && text.split(/\s+/).length <= 4
}

/** "Kafka(Strider))" → "Kafka(Strider)" (drops unmatched closing parentheses at the end). */
function balanceParentheses(text: string): string {
  let result = text
  while (result.endsWith(')') && count(result, ')') > count(result, '('))
    result = result.slice(0, -1)
  return result
}

function count(text: string, char: string): number {
  return text.split(char).length - 1
}

/** "### Faixa salarial\n\nR$ 8.000" → { "faixa salarial": "R$ 8.000" } (GitHub issue forms). */
export function parseSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>()
  const pattern = /^#{2,3}\s*(.+?)\s*:?\s*$/gm
  const headings = [...markdown.matchAll(pattern)]

  headings.forEach((heading, index) => {
    const start = (heading.index ?? 0) + heading[0].length
    const end = headings[index + 1]?.index ?? markdown.length
    const name = (heading[1] ?? '').toLowerCase().replace(/:$/, '').trim()
    const content = markdown
      .slice(start, end)
      .replace(/^\s*_No response_\s*$/gim, '')
      .trim()
    if (name && content && !sections.has(name)) sections.set(name, content)
  })
  return sections
}

export function findSection(sections: Map<string, string>, names: string[]): string | null {
  for (const name of names) {
    const value = sections.get(name)
    if (value) return value
  }
  return null
}

export function firstUrl(text: string | null): string | null {
  // Trailing punctuation belongs to the sentence, not to the URL ("...?utm=x:" → "...?utm=x").
  return text?.match(/https?:\/\/[^\s)<>\]"']+/)?.[0]?.replace(/[.,;:!?]+$/, '') ?? null
}

// ─── Labels and free-text fields → structured fields ─────────────────────────────────────

const normalize = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

const SENIORITY: Record<string, Seniority> = {
  estagio: 'intern',
  junior: 'junior',
  jr: 'junior',
  pleno: 'mid',
  senior: 'senior',
  sr: 'senior',
  especialista: 'staff',
  lead: 'lead',
  'tech lead': 'lead',
}
const WORK_MODE: Record<string, WorkMode> = {
  remoto: 'remote',
  remote: 'remote',
  hibrido: 'hybrid',
  hybrid: 'hybrid',
  presencial: 'onsite',
  'on-site': 'onsite',
  onsite: 'onsite',
}
const EMPLOYMENT: Record<string, EmploymentType> = {
  clt: 'full_time',
  pj: 'contract',
  contrato: 'contract',
  estagio: 'internship',
  freela: 'freelance',
  freelance: 'freelance',
  temporario: 'temporary',
}

/** Picks the first label (or word of a free-text field) that maps to a value. */
function pick<T>(values: string[], table: Record<string, T>): T | null {
  for (const value of values) {
    const hit = table[normalize(value)]
    if (hit) return hit
  }
  return null
}

const words = (text: string | null) => (text ? text.split(/[\s,/;|()]+/).filter(Boolean) : [])

export function seniorityFrom(labels: string[], field: string | null): Seniority | null {
  return pick(labels, SENIORITY) ?? pick(words(field), SENIORITY)
}

export function workModeFrom(labels: string[], ...fields: (string | null)[]): WorkMode | null {
  return pick(labels, WORK_MODE) ?? pick(fields.flatMap(words), WORK_MODE)
}

export function employmentTypeFrom(labels: string[], field: string | null): EmploymentType | null {
  return pick(labels, EMPLOYMENT) ?? pick(words(field), EMPLOYMENT)
}
