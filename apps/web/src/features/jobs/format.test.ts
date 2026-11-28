import { describe, expect, it } from 'vitest'
import { formatLocation, formatRelativeDate, formatSalary, jobDateLabel } from './format'

// Intl uses a non-breaking space between the currency symbol and the amount.
const normalize = (value: string) => value.replace(/\s/g, ' ')

describe('formatSalary', () => {
  it('formats a range', () => {
    expect(
      normalize(formatSalary({ min: 8000, max: 12000, currency: 'BRL', period: 'month' })),
    ).toBe('R$ 8.000 – R$ 12.000/mês')
  })

  it('formats only a minimum as "a partir de"', () => {
    expect(
      normalize(formatSalary({ min: 120000, max: null, currency: 'USD', period: 'year' })),
    ).toBe('a partir de US$ 120.000/ano')
  })

  it('formats only a maximum as "até"', () => {
    expect(normalize(formatSalary({ min: null, max: 50, currency: 'EUR', period: 'hour' }))).toBe(
      'até € 50/h',
    )
  })

  it('shows a single value when min equals max', () => {
    expect(
      normalize(formatSalary({ min: 9000, max: 9000, currency: 'BRL', period: 'month' })),
    ).toBe('R$ 9.000/mês')
  })
})

describe('formatLocation', () => {
  it('joins work mode, location and country in pt-BR', () => {
    expect(
      formatLocation({ workMode: 'remote', locationText: 'Americas', countryCode: 'US' }),
    ).toBe('Remoto · Americas · Estados Unidos')
  })

  it('skips missing parts', () => {
    expect(formatLocation({ workMode: null, locationText: null, countryCode: 'BR' })).toBe('Brasil')
    expect(formatLocation({ workMode: null, locationText: null, countryCode: null })).toBe('')
  })
})

describe('formatRelativeDate', () => {
  const now = new Date('2026-11-25T12:00:00Z')
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()

  it.each([
    [0, 'hoje'],
    [1, 'ontem'],
    [3, 'há 3 dias'],
    [14, 'há 2 semanas'],
    [60, 'há 2 meses'],
    [400, 'ano passado'],
    [800, 'há 2 anos'],
  ])('%i days ago → %s', (days, expected) => {
    expect(formatRelativeDate(daysAgo(days), now)).toBe(expected)
  })
})

describe('jobDateLabel', () => {
  const now = new Date('2026-11-27T12:00:00Z')

  it('prefers when the job entered the user list', () => {
    expect(
      jobDateLabel({ addedAt: '2026-11-26T12:00:00Z', foundAt: '2026-11-20T12:00:00Z' }, now),
    ).toBe('Adicionada ontem')
  })

  it('falls back to when a saved search found it', () => {
    expect(jobDateLabel({ addedAt: null, foundAt: '2026-11-24T12:00:00Z' }, now)).toBe(
      'Encontrada há 3 dias',
    )
  })

  it('returns null without dates', () => {
    expect(jobDateLabel({ addedAt: null, foundAt: null }, now)).toBeNull()
  })
})
