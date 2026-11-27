/** Error from an external HTTP call (after retries). */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly url: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'HttpError'
  }
}

type FetchFn = typeof fetch

export type HttpClientOptions = {
  /** Per-attempt timeout. */
  timeoutMs?: number
  /** Extra attempts after the first one, for network errors, 429 and 5xx. */
  retries?: number
  /** Base delay of the exponential backoff (doubles each attempt). */
  backoffMs?: number
  userAgent?: string
  /** Injected in tests. */
  fetch?: FetchFn
  sleep?: (ms: number) => Promise<void>
}

export type HttpClient = {
  getJson(url: string | URL, init?: { headers?: Record<string, string> }): Promise<unknown>
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])
const MAX_RETRY_AFTER_MS = 60_000

/**
 * Minimal client for external APIs (job sources): timeout per attempt, retries with exponential
 * backoff on transient failures (honoring Retry-After), and an identifying User-Agent.
 */
export function createHttpClient({
  timeoutMs = 15_000,
  retries = 2,
  backoffMs = 1_000,
  userAgent = 'Rumo/0.1 (personal job search)',
  fetch: fetchFn = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: HttpClientOptions = {}): HttpClient {
  return {
    async getJson(url, init) {
      const target = String(url)
      let lastError: unknown

      for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) await sleep(retryDelay(lastError, backoffMs * 2 ** (attempt - 1)))

        let response: Response
        try {
          response = await fetchFn(target, {
            headers: { Accept: 'application/json', 'User-Agent': userAgent, ...init?.headers },
            signal: AbortSignal.timeout(timeoutMs),
          })
        } catch (error) {
          lastError = new HttpError(`Request failed: ${describe(error)}`, null, target, {
            cause: error,
          })
          continue // network error or timeout → retry
        }

        if (response.ok) {
          try {
            return await response.json()
          } catch (error) {
            throw new HttpError('Invalid JSON response', response.status, target, { cause: error })
          }
        }

        const error = new HttpError(`HTTP ${response.status}`, response.status, target)
        if (!RETRYABLE_STATUS.has(response.status)) throw error
        lastError = Object.assign(error, { retryAfter: response.headers.get('retry-after') })
      }

      throw lastError
    },
  }
}

/** Uses the server's Retry-After (seconds) when present, capped; otherwise the backoff delay. */
function retryDelay(error: unknown, backoff: number): number {
  const retryAfter = (error as { retryAfter?: string | null } | undefined)?.retryAfter
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN
  return Number.isFinite(seconds) && seconds >= 0
    ? Math.min(seconds * 1000, MAX_RETRY_AFTER_MS)
    : backoff
}

function describe(error: unknown): string {
  if (error instanceof Error && error.name === 'TimeoutError') return 'timeout'
  return error instanceof Error ? error.message : String(error)
}
