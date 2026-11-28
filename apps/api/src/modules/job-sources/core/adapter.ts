import type { z } from 'zod'
import type { HttpClient } from '../../../infra/http/http-client.js'
import type { SourceJob } from '../../jobs/domain/source-job.js'

/** A posting exactly as the source returned it. */
export type RawPosting = {
  /** The posting's id at the source (unique per source). */
  externalId: string
  payload: unknown
}

/** A posting converted to Rumo's format (validated by the jobs module before saving). */
export type NormalizedPosting = SourceJob

export type FetchContext = {
  http: HttpClient
}

/**
 * Contract every job source implements. Adding a source = a new folder under `adapters/`
 * implementing this interface + one line in the registry. The ingestion core never changes.
 */
export interface JobSourceAdapter<TConfig = unknown> {
  /** Matches `job_sources.key`. */
  readonly key: string
  /** Validates a feed's `config` for this source. */
  readonly configSchema: z.ZodType<TConfig, unknown>
  /**
   * Version of this adapter's normalization. Bump it whenever `normalize` (or a shared rule it
   * uses) changes: it is part of the raw payload hash, so the next run re-normalizes every
   * posting of this source instead of skipping "unchanged" ones.
   */
  readonly normalizationVersion: number
  /** Minimum time between two runs of the same feed (source terms / courtesy). */
  readonly minIntervalMs: number
  /** Streams the postings of a search, page by page. */
  fetch(config: TConfig, context: FetchContext): AsyncIterable<RawPosting>
  /** Converts one posting; throws when the payload is unusable (counted as a failed item). */
  normalize(posting: RawPosting): NormalizedPosting
}
