import { describe, expect, it } from 'vitest'
import { countryFromLocation, countryMentioned } from './location.js'
import { inferSeniority } from './seniority.js'

describe('inferSeniority', () => {
  it.each([
    // Real titles from the Remotive API (2026-11-27)
    ['Senior Data Engineer', 'senior'],
    ['Senior React Full-stack Developer', 'senior'],
    ['Senior Back-end Developerusa', 'senior'],
    ['Tech Lead Full-Stack Rails Engineer', 'lead'],
    ['WordPress Theme & Plugin Developer', null],
    ['Full-Stack Developer', null],
    // Common patterns
    ['Sr. Software Engineer', 'senior'],
    ['Staff Engineer', 'staff'],
    ['Principal Engineer', 'principal'],
    ['Engineering Manager', 'manager'],
    ['Senior Engineering Manager', 'manager'],
    ['Junior Frontend Developer', 'junior'],
    ['Jr Developer', 'junior'],
    ['Desenvolvedor Pleno', 'mid'],
    ['Desenvolvedor Sênior Node.js', 'senior'],
    ['Estágio em Desenvolvimento', 'intern'],
    ['Software Engineering Intern', 'intern'],
    // Real titles from backend-br/vagas (Google, 2026-11-27)
    ['Early Career Software Engineer, People with Disabilities', 'junior'],
    ['Software Engineer, Early Career (For Women in Tech Candidates)', 'junior'],
  ])('%s → %s', (title, expected) => {
    expect(inferSeniority(title)).toBe(expected)
  })

  it('does not match words that only contain the keywords', () => {
    expect(inferSeniority('Leadership Coach')).toBeNull()
    expect(inferSeniority('Srinivasan Labs Developer')).toBeNull()
    expect(inferSeniority('Midwest Sales Rep')).toBeNull()
  })
})

describe('countryFromLocation', () => {
  it.each([
    ['USA', 'US'],
    ['United States', 'US'],
    ['Brazil', 'BR'],
    ['Brasil', 'BR'],
    ['U.S.', 'US'],
  ])('%s → %s', (location, expected) => {
    expect(countryFromLocation(location)).toBe(expected)
  })

  it.each([
    // Real values from the Remotive API (2026-11-27)
    'Worldwide',
    'USA, Canada',
    'Americas, LATAM, Canada, USA timezones',
    'Europe, EMEA, Germany, European timezones',
    'LATAM, Europe, USA, Canada, APAC',
    // Others
    'Atlantis',
    '',
  ])('returns null for %j', (location) => {
    expect(countryFromLocation(location)).toBeNull()
  })
})

describe('countryMentioned', () => {
  it.each([
    // Real title prefixes from backend-br/vagas (2026-11-27)
    ['Belo Horizonte ou São Paulo, Brasil', 'BR'],
    ['Híbrido / São Paulo, Brasil', 'BR'],
    ['Joinville/SC', 'BR'],
    ['Rio de Janeiro - RJ', 'BR'],
    ['São Paulo ou Remoto, Brasil', 'BR'],
    ['Cidade do México, México', 'MX'],
    ['Remote (United States)', 'US'],
  ])('%s → %s', (text, expected) => {
    expect(countryMentioned(text)).toBe(expected)
  })

  it.each([
    'Buenos Aires, Argentina / Cidade do México, México',
    'São Paulo, Brasil / Santiago, Chile + 3 cidades',
    'Remoto',
    'Remote',
    'Híbrido',
    '',
  ])('returns null for %j (none or several countries)', (text) => {
    expect(countryMentioned(text)).toBeNull()
  })
})
