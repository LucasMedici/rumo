import { describe, expect, it, vi } from 'vitest'
import { createHttpClient, HttpError } from './http-client.js'

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })

function setup(responses: (Response | Error)[]) {
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) => {
    const next = responses.shift()
    if (!next) throw new Error('no more responses')
    if (next instanceof Error) throw next
    return next
  })
  const sleep = vi.fn(async (_ms: number) => {})
  const client = createHttpClient({
    fetch: fetch as typeof globalThis.fetch,
    sleep,
    retries: 2,
    backoffMs: 100,
  })
  return { client, fetch, sleep }
}

describe('http client', () => {
  it('returns the parsed JSON and identifies itself', async () => {
    const { client, fetch } = setup([json({ ok: true })])

    await expect(client.getJson('https://api.example.com/jobs')).resolves.toEqual({ ok: true })
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['User-Agent']).toContain('Rumo')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('retries 5xx and network errors with exponential backoff', async () => {
    const { client, fetch, sleep } = setup([
      json({}, 503),
      new TypeError('fetch failed'),
      json([1]),
    ])

    await expect(client.getJson('https://api.example.com')).resolves.toEqual([1])
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([100, 200])
  })

  it('honors Retry-After on 429 (capped)', async () => {
    const { client, sleep } = setup([json({}, 429, { 'retry-after': '7' }), json('ok')])

    await client.getJson('https://api.example.com')
    expect(sleep).toHaveBeenCalledWith(7000)
  })

  it('does not retry client errors like 400/401/404', async () => {
    const { client, fetch } = setup([json({}, 404)])

    await expect(client.getJson('https://api.example.com')).rejects.toMatchObject({
      name: 'HttpError',
      status: 404,
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('gives up after the configured retries with the last error', async () => {
    const { client, fetch } = setup([json({}, 500), json({}, 502), json({}, 503)])

    const error = (await client
      .getJson('https://api.example.com')
      .catch((e: unknown) => e)) as HttpError
    expect(error).toBeInstanceOf(HttpError)
    expect(error.status).toBe(503)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('reports invalid JSON without retrying', async () => {
    const { client } = setup([new Response('<html>oops</html>', { status: 200 })])

    await expect(client.getJson('https://api.example.com')).rejects.toThrow('Invalid JSON')
  })
})
