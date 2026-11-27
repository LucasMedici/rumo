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
