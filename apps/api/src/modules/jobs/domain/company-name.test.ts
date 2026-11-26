import { describe, expect, it } from 'vitest'
import { cleanCompanyDisplayName, normalizeCompanyName } from './company-name.js'

describe('normalizeCompanyName', () => {
  it.each([
    ['Nubank', 'nubank'],
    ['NUBANK S.A.', 'nubank'],
    ['Nubank S/A', 'nubank'],
    ['Itaú Unibanco S.A.', 'itau unibanco'],
    ['Stone Pagamentos Ltda.', 'stone pagamentos'],
    ['Acme, Inc.', 'acme'],
    ['Acme Inc', 'acme'],
    ['Stripe LLC', 'stripe'],
    ['Delivery Hero GmbH', 'delivery hero'],
    ['  Mercado   Livre  ', 'mercado livre'],
    ['Procter & Gamble Co.', 'procter and gamble'],
    ['C6 Bank', 'c6 bank'],
    ['Ação Ltda ME', 'acao'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeCompanyName(input)).toBe(expected)
  })

  it('only strips suffixes at the end, as whole words', () => {
    expect(normalizeCompanyName('Sanofi')).toBe('sanofi')
    expect(normalizeCompanyName('Incognia')).toBe('incognia')
    expect(normalizeCompanyName('Co Labs Inc')).toBe('co labs')
  })

  it('keeps the name when it is only a suffix', () => {
    expect(normalizeCompanyName('Inc.')).toBe('inc')
  })
})

describe('cleanCompanyDisplayName', () => {
  it('trims and collapses spaces, keeping casing', () => {
    expect(cleanCompanyDisplayName('  Mercado   Livre ')).toBe('Mercado Livre')
  })
})
