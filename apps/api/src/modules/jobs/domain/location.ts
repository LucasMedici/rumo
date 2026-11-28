/** Names (lowercase, no accents) → ISO 3166-1 alpha-2 for the countries most relevant to Rumo. */
const COUNTRIES: Record<string, string> = {
  usa: 'US',
  us: 'US',
  'united states': 'US',
  'united states of america': 'US',
  canada: 'CA',
  brazil: 'BR',
  brasil: 'BR',
  mexico: 'MX',
  argentina: 'AR',
  chile: 'CL',
  colombia: 'CO',
  uk: 'GB',
  'united kingdom': 'GB',
  england: 'GB',
  ireland: 'IE',
  portugal: 'PT',
  spain: 'ES',
  germany: 'DE',
  france: 'FR',
  netherlands: 'NL',
  poland: 'PL',
  sweden: 'SE',
  switzerland: 'CH',
  australia: 'AU',
  'new zealand': 'NZ',
  india: 'IN',
  singapore: 'SG',
  japan: 'JP',
  israel: 'IL',
}

/** Words that describe a timezone/region rather than a place ("USA timezones" is not "USA"). */
const REGION_HINTS =
  /\b(timezones?|time zones?|worldwide|anywhere|global|remote|emea|apac|latam|americas|europe|asia|africa)\b/i

/**
 * Returns a country code only when the location names exactly one known country
 * ("USA" → US). Lists, regions and timezones ("USA, Canada", "Worldwide", "Europe") → null.
 */
export function countryFromLocation(location: string | null | undefined): string | null {
  if (!location?.trim() || REGION_HINTS.test(location)) return null

  const parts = location
    .split(/[,;/|]| or | and /i)
    .map((part) => normalize(part))
    .filter(Boolean)
  const codes = new Set(parts.map((part) => COUNTRIES[part]))

  if (codes.size !== 1 || codes.has(undefined)) return null
  return [...codes][0] ?? null
}

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\./g, '')
    .trim()
}

/** Brazilian state codes, as used in "Joinville/SC", "Rio de Janeiro - RJ", "Campinas, SP". */
const BR_STATES =
  /(?:^|[\s/,(-])(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)(?=$|[\s/,)-])/

/**
 * Returns a country code when a free-text place mentions exactly one known country
 * ("São Paulo ou Belo Horizonte, Brasil" → BR, "Joinville/SC" → BR). Several countries,
 * none, or only regions → null.
 */
export function countryMentioned(text: string | null | undefined): string | null {
  if (!text?.trim()) return null
  const normalized = ` ${normalize(text).replace(/[^\p{Letter}\p{Number}]+/gu, ' ')} `
  const found = new Set<string>()

  for (const [name, code] of Object.entries(COUNTRIES)) {
    if (name.length <= 2) continue // "us"/"uk" are too ambiguous inside free text
    if (normalized.includes(` ${name} `)) found.add(code)
  }
  if (BR_STATES.test(text)) found.add('BR')

  return found.size === 1 ? ([...found][0] ?? null) : null
}
