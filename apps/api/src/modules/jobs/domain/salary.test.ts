import { describe, expect, it } from 'vitest'
import { parseSalaryText } from './salary.js'

describe('parseSalaryText', () => {
  // Real values returned by the Remotive API (2026-11-27).
  it.each([
    ['$57K - $67K', { min: 57000, max: 67000, currency: 'USD', period: 'year' }],
    ['$170k - $200k', { min: 170000, max: 200000, currency: 'USD', period: 'year' }],
    ['$14/hour', { min: 14, max: null, currency: 'USD', period: 'hour' }],
    ['$14 - $20/hour', { min: 14, max: 20, currency: 'USD', period: 'hour' }],
    ['$50-$75 /hour', { min: 50, max: 75, currency: 'USD', period: 'hour' }],
    ['$35,3k- $52k', { min: 35300, max: 52000, currency: 'USD', period: 'year' }],
    ['OTE $25k - $35k', { min: 25000, max: 35000, currency: 'USD', period: 'year' }],
    ['$3.5k–$5k/month', { min: 3500, max: 5000, currency: 'USD', period: 'month' }],
  ])('%s', (text, expected) => {
    expect(parseSalaryText(text)).toEqual(expected)
  })

  it.each([
    [
      'USD 120,000 - 150,000 per year',
      { min: 120000, max: 150000, currency: 'USD', period: 'year' },
    ],
    ['€60.000 - €75.000', { min: 60000, max: 75000, currency: 'EUR', period: 'year' }],
    ['R$ 8.000 a R$ 12.000 por mês', { min: 8000, max: 12000, currency: 'BRL', period: 'month' }],
    ['£45k', { min: 45000, max: null, currency: 'GBP', period: 'year' }],
    ['CAD 90k annually', { min: 90000, max: null, currency: 'CAD', period: 'year' }],
  ])('%s', (text, expected) => {
    expect(parseSalaryText(text)).toEqual(expected)
  })

  it.each([
    ['', 'empty'],
    ['Competitive', 'no amount'],
    ['80k - 100k', 'no currency'],
    ['$5,000 - $8,000', 'ambiguous period (could be monthly)'],
  ])('returns null for %j (%s)', (text) => {
    expect(parseSalaryText(text)).toBeNull()
  })
})
