import { describe, expect, it } from 'vitest'
import { describeFeedConfig, formatWhen, parseList } from './format'

describe('describeFeedConfig', () => {
  it('describes a Remotive search', () => {
    expect(
      describeFeedConfig({
        sourceKey: 'remotive',
        config: { category: 'software-development', search: 'typescript', maxResults: 100 },
      }),
    ).toBe('Desenvolvimento de software · “typescript”')
  })

  it('describes a GitHub search with labels and keywords', () => {
    expect(
      describeFeedConfig({
        sourceKey: 'github-issues',
        config: { repo: 'backend-br/vagas', labels: ['Remoto', 'Pleno'], keywords: ['node'] },
      }),
    ).toBe('backend-br/vagas · labels: Remoto, Pleno · palavras: node')
  })

  it('omits empty parts', () => {
    expect(
      describeFeedConfig({
        sourceKey: 'github-issues',
        config: { repo: 'frontendbr/vagas', labels: [], keywords: [] },
      }),
    ).toBe('frontendbr/vagas')
  })
})

describe('formatWhen', () => {
  const now = new Date(2026, 10, 27, 15, 0)

  it.each([
    [new Date(2026, 10, 27, 14, 2), 'hoje às 14:02'],
    [new Date(2026, 10, 26, 9, 10), 'ontem às 09:10'],
    [new Date(2026, 10, 28, 8, 0), 'amanhã às 08:00'],
    [new Date(2026, 10, 25, 18, 30), '25/11 às 18:30'],
  ])('%s → %s', (date, expected) => {
    expect(formatWhen(date.toISOString(), now)).toBe(expected)
  })
})

describe('parseList', () => {
  it('splits by comma, trims and drops empties', () => {
    expect(parseList(' Remoto,  Pleno ,, ')).toEqual(['Remoto', 'Pleno'])
    expect(parseList('')).toEqual([])
  })
})
