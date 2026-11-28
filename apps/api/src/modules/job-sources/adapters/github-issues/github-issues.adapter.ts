import { type GithubIssuesConfig, githubIssuesConfigSchema } from '@rumo/contracts'
import { z } from 'zod'
import { cleanCompanyDisplayName } from '../../../jobs/domain/company-name.js'
import { countryMentioned } from '../../../jobs/domain/location.js'
import { markdownToPlainText } from '../../../jobs/domain/markdown-to-text.js'
import { parseSalaryText } from '../../../jobs/domain/salary.js'
import { inferSeniority } from '../../../jobs/domain/seniority.js'
import type { JobSourceAdapter, NormalizedPosting, RawPosting } from '../../core/adapter.js'
import {
  employmentTypeFrom,
  findSection,
  firstUrl,
  parseIssueTitle,
  parseSections,
  seniorityFrom,
  workModeFrom,
} from './parse.js'

const API = 'https://api.github.com'
const PER_PAGE = 100
const MAX_PAGES = 5
export const UNKNOWN_COMPANY = 'Empresa não informada'

const issueSchema = z.object({
  number: z.number().int(),
  html_url: z.url(),
  title: z.string().trim().min(1),
  body: z.string().nullish(),
  created_at: z.string(),
  labels: z.array(z.union([z.string(), z.object({ name: z.string() })])),
})
type Issue = z.infer<typeof issueSchema>

const labelNames = (issue: Pick<Issue, 'labels'>) =>
  issue.labels.map((label) => (typeof label === 'string' ? label : label.name))

/**
 * GitHub Issues of Brazilian community job boards (backend-br/vagas and similar), via the official
 * GitHub REST API. Each open issue is a job posting; labels carry seniority, work mode and contract.
 * Unauthenticated limit: 60 requests/hour per IP (a token raises it to 5,000).
 */
export function createGithubIssuesAdapter({
  token,
}: {
  token?: string | undefined
} = {}): JobSourceAdapter<GithubIssuesConfig> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token && { Authorization: `Bearer ${token}` }),
  }

  return {
    key: 'github-issues',
    configSchema: githubIssuesConfigSchema,
    // v2: salary only from the first sentence; "early career" → junior
    normalizationVersion: 2,
    minIntervalMs: 60 * 60 * 1000,

    async *fetch(config, { http }) {
      const keywords = config.keywords.map((keyword) => keyword.toLowerCase())
      let yielded = 0

      for (let page = 1; page <= MAX_PAGES && yielded < config.maxResults; page++) {
        const url = new URL(`${API}/repos/${config.repo}/issues`)
        url.searchParams.set('state', 'open')
        url.searchParams.set('sort', 'created')
        url.searchParams.set('direction', 'desc')
        url.searchParams.set('per_page', String(PER_PAGE))
        url.searchParams.set('page', String(page))
        if (config.labels.length > 0) url.searchParams.set('labels', config.labels.join(','))

        const items = z.array(z.unknown()).parse(await http.getJson(url, { headers }))
        for (const item of items) {
          const issue = item as Partial<Issue> & { pull_request?: unknown }
          if (issue.pull_request) continue // the issues endpoint also returns pull requests
          if (keywords.length > 0 && !matchesKeywords(issue, keywords)) continue
          yield { externalId: `${config.repo}#${issue.number}`, payload: item }
          if (++yielded >= config.maxResults) return
        }
        if (items.length < PER_PAGE) return // last page
      }
    },

    normalize(posting: RawPosting): NormalizedPosting {
      const issue = issueSchema.parse(posting.payload)
      const labels = labelNames(issue)
      const body = issue.body ?? ''
      const sections = parseSections(body)
      const parsed = parseIssueTitle(issue.title)

      const level = findSection(sections, ['nível', 'nivel', 'senioridade', 'level'])
      const regime = findSection(sections, [
        'regime de contratação',
        'regime',
        'contratação',
        'contract',
      ])
      const workModel = findSection(sections, ['modelo de trabalho', 'alocação', 'work model'])
      const placeField = findSection(sections, ['localização', 'local', 'location'])
      const website = firstUrl(findSection(sections, ['site da empresa', 'company website']))
      const place = parsed.place ?? placeField

      return {
        title: parsed.title,
        companyName: cleanCompanyDisplayName(
          parsed.companyName ?? companyFromWebsite(website) ?? UNKNOWN_COMPANY,
        ),
        description: markdownToPlainText(body) || parsed.title,
        sourceUrl: issue.html_url,
        applyUrl:
          firstUrl(findSection(sections, ['como se candidatar', 'how to apply', 'candidatura'])) ??
          issue.html_url,
        locationText: place,
        countryCode: countryMentioned(place),
        workMode: workModeFrom(labels, workModel, parsed.place, placeField),
        seniority: seniorityFrom(labels, level) ?? inferSeniority(parsed.title),
        employmentType: employmentTypeFrom(labels, regime),
        salary: parseSalaryText(
          findSection(sections, ['faixa salarial', 'salary range', 'salário', 'remuneração']),
        ),
        postedAt: parseDate(issue.created_at),
      }
    },
  }
}

function matchesKeywords(issue: Partial<Issue>, keywords: string[]): boolean {
  const haystack = [
    issue.title ?? '',
    issue.body ?? '',
    ...labelNames({ labels: issue.labels ?? [] }),
  ]
    .join('\n')
    .toLowerCase()
  return keywords.some((keyword) => haystack.includes(keyword))
}

/** "https://www.mimix-ai.xyz" → "mimix-ai.xyz" (better than no company at all). */
function companyFromWebsite(url: string | null): string | null {
  if (!url) return null
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    // Forms and link shorteners are not company websites.
    return /(^|\.)(forms\.gle|google\.com|bit\.ly|linktr\.ee|github\.com)$/.test(host) ? null : host
  } catch {
    return null
  }
}

function parseDate(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
