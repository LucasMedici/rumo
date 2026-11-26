/**
 * Legal-entity suffixes that don't distinguish companies ("Nubank S.A." === "Nubank").
 * Matched as whole words at the end of the name, after punctuation is removed.
 */
const LEGAL_SUFFIXES = [
  'sa',
  'ltda',
  'ltd',
  'me',
  'epp',
  'eireli',
  'inc',
  'incorporated',
  'llc',
  'corp',
  'corporation',
  'co',
  'gmbh',
  'ag',
  'bv',
  'plc',
  'limited',
  'srl',
  'sas',
]

const SUFFIX_PATTERN = new RegExp(`(?:\\s(?:${LEGAL_SUFFIXES.join('|')}))+$`)

/**
 * Normalizes a company name into a deduplication key:
 * lowercase, no accents, no punctuation, no legal suffixes, single spaces.
 * Returns the cleaned original if stripping suffixes would leave nothing (e.g. "Inc").
 */
export function normalizeCompanyName(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\./g, '') // "S.A." → "sa", "Inc." → "inc"
    .replace(/\bs\s*\/\s*a\b/g, 'sa') // "S/A" → "sa"
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()

  const withoutSuffix = base.replace(SUFFIX_PATTERN, '').trim()
  return withoutSuffix || base
}

/** Cleans the display name (trims and collapses whitespace), keeping the user's casing. */
export function cleanCompanyDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}
