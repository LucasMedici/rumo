import type { Feed } from '@rumo/contracts'

export const SOURCE_LABELS: Record<string, string> = {
  remotive: 'Remotive',
  'github-issues': 'GitHub (comunidade)',
}

export const SOURCE_DESCRIPTIONS: Record<string, string> = {
  remotive: 'Vagas remotas internacionais. Atualiza no máximo 4 vezes por dia.',
  'github-issues': 'Vagas de tecnologia publicadas pela comunidade brasileira no GitHub.',
}

export const REMOTIVE_CATEGORY_LABELS: Record<string, string> = {
  'software-development': 'Desenvolvimento de software',
  devops: 'DevOps',
  data: 'Dados',
  'artificial-intelligence': 'Inteligência artificial',
  qa: 'Qualidade (QA)',
  product: 'Produto',
  design: 'Design',
  'project-management': 'Gestão de projetos',
}

export const GITHUB_REPO_LABELS: Record<string, string> = {
  'backend-br/vagas': 'Backend (backend-br/vagas)',
  'frontendbr/vagas': 'Frontend (frontendbr/vagas)',
  'CocoaHeadsBrasil/vagas': 'iOS (CocoaHeadsBrasil/vagas)',
  'dotnetdevbr/vagas': '.NET (dotnetdevbr/vagas)',
}

const asString = (value: unknown) => (typeof value === 'string' ? value : null)
const asList = (value: unknown) =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []

/** One line describing what the search looks for. */
export function describeFeedConfig(feed: Pick<Feed, 'sourceKey' | 'config'>): string {
  const { config } = feed
  if (feed.sourceKey === 'remotive') {
    const category = asString(config.category)
    const search = asString(config.search)
    return [
      category ? (REMOTIVE_CATEGORY_LABELS[category] ?? category) : null,
      search ? `“${search}”` : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }
  if (feed.sourceKey === 'github-issues') {
    const repo = asString(config.repo)
    const labels = asList(config.labels)
    const keywords = asList(config.keywords)
    return [
      repo,
      labels.length > 0 ? `labels: ${labels.join(', ')}` : null,
      keywords.length > 0 ? `palavras: ${keywords.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }
  return ''
}

const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })

/** "hoje às 14:02", "ontem às 09:10", "25/11 às 18:30". */
export function formatWhen(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  const day =
    days === 0 ? 'hoje' : days === 1 ? 'ontem' : days === -1 ? 'amanhã' : dayMonth.format(date)
  return `${day} às ${time.format(date)}`
}

/** Comma-separated text → trimmed list ("Remoto, Pleno" → ["Remoto", "Pleno"]). */
export function parseList(text: string): string[] {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
