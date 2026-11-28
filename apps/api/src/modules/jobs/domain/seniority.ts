import type { Seniority } from '@rumo/contracts'

/** Ordered: the first match wins ("Senior Engineering Manager" → manager, "Staff" before "senior"). */
const RULES: [RegExp, Seniority][] = [
  [/\b(intern(ship)?|estagi[aá]ri[oa]|est[aá]gio|trainee)\b/i, 'intern'],
  [
    /\b(head of|director|diretor[a]?|vp|vice president|(engineering |tech |technical )?manager|gerente|coordenador[a]?)\b/i,
    'manager',
  ],
  [/\b(principal)\b/i, 'principal'],
  [/\b(staff|especialista)\b/i, 'staff'],
  [/\b(tech lead|technical lead|team lead|lead|l[ií]der t[eé]cnic[oa])\b/i, 'lead'],
  [/\b(senior|s[eê]nior|sr\.?)(?=\W|$)/i, 'senior'],
  [/\b(mid[- ]?level|mid|pleno|intermediate)\b/i, 'mid'],
  [/\b(junior|j[uú]nior|jr\.?|entry[- ]level|early[- ]career|graduate)(?=\W|$)/i, 'junior'],
]

/** Infers seniority from a job title; null when the title doesn't say. */
export function inferSeniority(title: string): Seniority | null {
  for (const [pattern, seniority] of RULES) {
    if (pattern.test(title)) return seniority
  }
  return null
}
