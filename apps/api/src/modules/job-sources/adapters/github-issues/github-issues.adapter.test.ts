import { githubIssuesConfigSchema } from '@rumo/contracts'
import { describe, expect, it, vi } from 'vitest'
import type { HttpClient } from '../../../../infra/http/http-client.js'
import { sourceJobSchema } from '../../../jobs/domain/source-job.js'
import type { RawPosting } from '../../core/adapter.js'
import fixture from './__fixtures__/backend-br-issues.json' with { type: 'json' }
import { createGithubIssuesAdapter, UNKNOWN_COMPANY } from './github-issues.adapter.js'

const adapter = createGithubIssuesAdapter()

function httpReturning(...pages: unknown[]) {
  const getJson = vi.fn(
    async (_url: string | URL, _init?: { headers?: Record<string, string> }) => pages.shift() ?? [],
  )
  return { http: { getJson } satisfies HttpClient, getJson }
}

async function collect(iterable: AsyncIterable<RawPosting>) {
  const items: RawPosting[] = []
  for await (const item of iterable) items.push(item)
  return items
}

const config = (overrides: object = {}) =>
  githubIssuesConfigSchema.parse({ repo: 'backend-br/vagas', ...overrides })

describe('github issues adapter: fetch', () => {
  it('lists open issues of the repo, newest first, with the GitHub API headers', async () => {
    const { http, getJson } = httpReturning(fixture)

    const postings = await collect(adapter.fetch(config({ labels: ['Remoto'] }), { http }))

    const [url, init] = getJson.mock.calls[0] ?? []
    const parsed = new URL(String(url))
    expect(parsed.pathname).toBe('/repos/backend-br/vagas/issues')
    expect(Object.fromEntries(parsed.searchParams)).toMatchObject({
      state: 'open',
      sort: 'created',
      direction: 'desc',
      labels: 'Remoto',
    })
    expect(init?.headers?.Accept).toBe('application/vnd.github+json')
    expect(init?.headers?.Authorization).toBeUndefined()
    expect(postings.map((p) => p.externalId)).toEqual(
      fixture.map((issue) => `backend-br/vagas#${issue.number}`),
    )
  })

  it('sends the token when configured', async () => {
    const { http, getJson } = httpReturning([])

    await collect(createGithubIssuesAdapter({ token: 'ghp_test' }).fetch(config(), { http }))

    expect(getJson.mock.calls[0]?.[1]?.headers?.Authorization).toBe('Bearer ghp_test')
  })

  it('filters by keywords in title, labels or body (any keyword)', async () => {
    const { http } = httpReturning(fixture)

    const postings = await collect(adapter.fetch(config({ keywords: ['Node.js'] }), { http }))

    expect(postings.length).toBeGreaterThan(0)
    expect(postings.length).toBeLessThan(fixture.length)
  })

  it('skips pull requests and stops at maxResults', async () => {
    const pr = { ...fixture[0], number: 1, pull_request: { url: 'x' } }
    const { http } = httpReturning([pr, ...fixture])

    const postings = await collect(adapter.fetch(config({ maxResults: 2 }), { http }))

    expect(postings.map((p) => p.externalId)).not.toContain('backend-br/vagas#1')
    expect(postings).toHaveLength(2)
  })

  it('paginates while pages are full', async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ ...fixture[0], number: 1000 + i }))
    const { http, getJson } = httpReturning(fullPage, fixture)

    const postings = await collect(adapter.fetch(config({ maxResults: 300 }), { http }))

    expect(getJson).toHaveBeenCalledTimes(2)
    expect(new URL(String(getJson.mock.calls[1]?.[0])).searchParams.get('page')).toBe('2')
    expect(postings).toHaveLength(100 + fixture.length)
  })
})

describe('github issues adapter: normalize (real issues)', () => {
  const byNumber = new Map(
    fixture.map((issue) => [
      issue.number,
      adapter.normalize({ externalId: `backend-br/vagas#${issue.number}`, payload: issue }),
    ]),
  )
  const job = (number: number) => {
    const normalized = byNumber.get(number)
    if (!normalized) throw new Error(`missing fixture issue ${number}`)
    return normalized
  }

  it('produces data that passes the jobs validation for every issue', () => {
    for (const normalized of byNumber.values()) {
      expect(sourceJobSchema.safeParse(normalized).success).toBe(true)
    }
  })

  it('international remote job: company from "na X", salary from the form, labels', () => {
    expect(job(12495)).toMatchObject({
      title: 'Product Engineer',
      companyName: 'JotPsych',
      workMode: 'remote',
      seniority: 'senior',
      employmentType: 'contract',
      locationText: 'Remote',
      countryCode: null,
      salary: { min: 5000, max: 8000, currency: 'USD', period: 'month' },
      sourceUrl: 'https://github.com/backend-br/vagas/issues/12495',
    })
  })

  it('Brazilian job: company from " - X", fields from labels', () => {
    expect(job(12494)).toMatchObject({
      title: 'Desenvolvedor(a) Backend Pleno - White Label e Plataforma',
      companyName: 'Mimix AI',
      workMode: 'remote',
      seniority: 'mid',
      employmentType: 'contract',
    })
  })

  it('city/state prefix → Brazil; no company in the title → website fallback', () => {
    const joinville = job(12481)
    expect(joinville).toMatchObject({
      title: 'Back-end ou Full Stack Developer (Node.js + React)',
      locationText: 'Joinville/SC',
      countryCode: 'BR',
      workMode: 'hybrid',
      seniority: 'senior',
    })
    expect(joinville.companyName).not.toBe('')
  })

  it('company in parentheses; Google jobs with a Brazilian location', () => {
    expect(job(12440)).toMatchObject({ companyName: 'Strider', workMode: 'remote' })
    expect(job(12460)).toMatchObject({ companyName: 'Google', countryCode: 'BR' })
  })

  it('uses the "how to apply" link when present, otherwise the issue', () => {
    for (const normalized of byNumber.values()) {
      expect(normalized.applyUrl).toMatch(/^https?:\/\//)
    }
    expect(job(12494).applyUrl).not.toBe(job(12494).sourceUrl)
  })

  it('keeps the description as plain text with readable links', () => {
    for (const normalized of byNumber.values()) {
      expect(normalized.description).not.toMatch(/<\/?[a-z][^>]*>/i)
      expect(normalized.description).not.toMatch(/^#{1,3}\s/m)
      expect(normalized.description).not.toContain('_No response_')
    }
  })

  it('falls back to "unknown company" when nothing names it', () => {
    const anonymous = adapter.normalize({
      externalId: 'backend-br/vagas#1',
      payload: {
        number: 1,
        html_url: 'https://github.com/backend-br/vagas/issues/1',
        title: '[Remoto] Desenvolvedor Backend',
        body: 'Vaga legal.',
        created_at: '2026-11-20T10:00:00Z',
        labels: [],
      },
    })
    expect(anonymous.companyName).toBe(UNKNOWN_COMPANY)
  })
})
