import { z } from 'zod'

// ─── Remotive ────────────────────────────────────────────────────────────────────────────

/** Remotive categories most relevant to tech careers (the API accepts any category slug). */
export const remotiveCategories = [
  'software-development',
  'devops',
  'data',
  'artificial-intelligence',
  'qa',
  'product',
  'design',
  'project-management',
] as const

export const remotiveConfigSchema = z
  .object({
    /** Matched by Remotive against title AND description (be specific: "node.js", not "node"). */
    search: z.string().trim().min(2).max(100).optional(),
    /** Category slug, e.g. "software-development". */
    category: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/)
      .max(60)
      .optional(),
    /** Remotive ignores `limit`, so we cap the number of postings per run ourselves. */
    maxResults: z.number().int().min(1).max(200).default(100),
  })
  .refine((config) => config.search || config.category, {
    message: 'Inform a search term or a category',
    path: ['search'],
  })
export type RemotiveConfig = z.infer<typeof remotiveConfigSchema>

// ─── GitHub Issues (Brazilian community job boards) ──────────────────────────────────────

/** Active community job repositories (checked 2026-11-27; stale repos left out). */
export const githubJobRepos = [
  'backend-br/vagas',
  'frontendbr/vagas',
  'CocoaHeadsBrasil/vagas',
  'dotnetdevbr/vagas',
] as const

export const githubIssuesConfigSchema = z.object({
  repo: z.enum(githubJobRepos),
  /** GitHub labels that must ALL be present, e.g. ["Remoto", "Pleno"]. */
  labels: z.array(z.string().trim().min(1).max(50)).max(5).default([]),
  /** Kept when ANY keyword appears in the title, labels or text (case-insensitive). */
  keywords: z.array(z.string().trim().min(2).max(50)).max(10).default([]),
  maxResults: z.number().int().min(1).max(300).default(100),
})
export type GithubIssuesConfig = z.infer<typeof githubIssuesConfigSchema>

// ─── Saved searches (feeds) ──────────────────────────────────────────────────────────────

export const sourceKeys = ['remotive', 'github-issues'] as const
export const sourceKeySchema = z.enum(sourceKeys)
export type SourceKey = z.infer<typeof sourceKeySchema>

const feedName = z.string().trim().min(2).max(80)

/** POST /feeds — the config shape depends on the source. */
export const createFeedSchema = z.discriminatedUnion('sourceKey', [
  z.object({
    sourceKey: z.literal('remotive'),
    name: feedName,
    config: remotiveConfigSchema,
    enabled: z.boolean().default(true),
  }),
  z.object({
    sourceKey: z.literal('github-issues'),
    name: feedName,
    config: githubIssuesConfigSchema,
    enabled: z.boolean().default(true),
  }),
])
export type CreateFeedInput = z.infer<typeof createFeedSchema>

/** PATCH /feeds/:id — `config` is validated by the feed's source on the server. */
export const updateFeedSchema = z
  .object({
    name: feedName.optional(),
    enabled: z.boolean().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' })
export type UpdateFeedInput = z.infer<typeof updateFeedSchema>

// ─── Ingestion runs ──────────────────────────────────────────────────────────────────────

export const ingestionRunStatusSchema = z.enum(['running', 'succeeded', 'failed'])

export const ingestionStatsSchema = z.object({
  fetched: z.number().int().nonnegative(),
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
})
export type IngestionStats = z.infer<typeof ingestionStatsSchema>

export const ingestionRunSchema = z.object({
  id: z.uuid(),
  feedId: z.uuid(),
  status: ingestionRunStatusSchema,
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  stats: ingestionStatsSchema,
  error: z.string().nullable(),
})
export type IngestionRun = z.infer<typeof ingestionRunSchema>

export const feedSchema = z.object({
  id: z.uuid(),
  sourceKey: z.string(),
  sourceName: z.string(),
  name: z.string(),
  config: z.record(z.string(), z.unknown()),
  enabled: z.boolean(),
  lastRunAt: z.iso.datetime().nullable(),
  /** Earliest time a new run is allowed (source limits); null when it can run now. */
  nextRunAt: z.iso.datetime().nullable(),
  lastRun: ingestionRunSchema.nullable(),
  /** Jobs this feed has found so far. */
  jobCount: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
})
export type Feed = z.infer<typeof feedSchema>

export const feedListResponseSchema = z.object({ items: z.array(feedSchema) })
export const runListResponseSchema = z.object({ items: z.array(ingestionRunSchema) })

export const feedIdParamsSchema = z.object({ id: z.uuid() })
export const runParamsSchema = z.object({ id: z.uuid(), runId: z.uuid() })
