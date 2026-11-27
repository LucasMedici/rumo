import { describe, expect, it } from 'vitest'
import { countryFromLocation } from './location.js'
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
