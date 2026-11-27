import { describe, expect, it, vi } from 'vitest'
import type { HttpClient } from '../../../../infra/http/http-client.js'
import type { RawPosting } from '../../core/adapter.js'
import fixture from './__fixtures__/remote-jobs.json' with { type: 'json' }
import { remotiveAdapter } from './remotive.adapter.js'

function httpReturning(body: unknown) {
  const getJson = vi.fn(async (_url: string | URL) => body)
  return { http: { getJson } satisfies HttpClient, getJson }
}

async function collect(iterable: AsyncIterable<RawPosting>) {
  const items: RawPosting[] = []
  for await (const item of iterable) items.push(item)
  return items
}

const config = remotiveAdapter.configSchema.parse({
  search: 'node.js',
  category: 'software-development',
})

describe('remotive adapter: fetch', () => {
  it('calls the official endpoint with search and category', async () => {
    const { http, getJson } = httpReturning(fixture)

    await collect(remotiveAdapter.fetch(config, { http }))

    const url = new URL(String(getJson.mock.calls[0]?.[0]))
    expect(url.origin + url.pathname).toBe('https://remotive.com/api/remote-jobs')
    expect(url.searchParams.get('search')).toBe('node.js')
    expect(url.searchParams.get('category')).toBe('software-development')
  })

  it('yields every posting with its Remotive id', async () => {
    const { http } = httpReturning(fixture)

    const postings = await collect(remotiveAdapter.fetch(config, { http }))

    expect(postings.map((p) => p.externalId)).toEqual(['2091179', '2091177', '2091165', '2091137'])
  })

  it('caps results with maxResults (the API ignores `limit`)', async () => {
    const { http } = httpReturning(fixture)

    const postings = await collect(remotiveAdapter.fetch({ ...config, maxResults: 2 }, { http }))

    expect(postings).toHaveLength(2)
  })

  it('fails loudly on an unexpected response shape', async () => {
    const { http } = httpReturning({ error: 'blocked' })

    await expect(collect(remotiveAdapter.fetch(config, { http }))).rejects.toThrow()
  })
})

describe('remotive adapter: normalize (real payloads)', () => {
  const [contract, partTime, monthly, senior] = fixture.jobs.map((payload) =>
    remotiveAdapter.normalize({ externalId: String(payload.id), payload }),
  )

  it('maps a contract job with a yearly salary range', () => {
    expect(contract).toMatchObject({
      title: 'WordPress Theme & Plugin Developer',
      companyName: 'Steward Web Development',
      sourceUrl: expect.stringMatching(/^https:\/\/remotive\.com\//),
      applyUrl: expect.stringMatching(/^https:\/\/remotive\.com\//),
      workMode: 'remote',
      employmentType: 'contract',
      seniority: null,
      locationText: 'Americas, LATAM, Canada, USA timezones',
      countryCode: null,
      salary: { min: 57000, max: 67000, currency: 'USD', period: 'year' },
    })
    expect(contract?.postedAt?.toISOString()).toBe('2026-11-24T10:31:32.000Z')
  })

  it('detects a single-country location and an hourly salary', () => {
    expect(partTime).toMatchObject({
      employmentType: 'part_time',
      countryCode: 'US',
      salary: { min: 14, max: null, currency: 'USD', period: 'hour' },
    })
  })

  it('parses a monthly salary', () => {
    expect(monthly?.salary).toEqual({ min: 3500, max: 5000, currency: 'USD', period: 'month' })
  })

  it('infers seniority from the title and handles an empty salary', () => {
    expect(senior).toMatchObject({ seniority: 'senior', employmentType: 'full_time', salary: null })
  })

  it('stores the description as plain text, never HTML', () => {
    for (const posting of [contract, partTime, monthly, senior]) {
      expect(posting?.description.length).toBeGreaterThan(100)
      expect(posting?.description).not.toMatch(/<\/?[a-z][^>]*>/i)
      expect(posting?.description).not.toContain('utm_source')
    }
  })

  it('throws on payloads missing required fields', () => {
    expect(() =>
      remotiveAdapter.normalize({ externalId: '1', payload: { id: 1, title: 'No company' } }),
    ).toThrow()
  })
})
