import { describe, expect, it } from 'vitest'
import {
  employmentTypeFrom,
  firstUrl,
  parseIssueTitle,
  parseSections,
  seniorityFrom,
  workModeFrom,
} from './parse.js'

describe('parseIssueTitle (real titles from backend-br/vagas, 2026-11-27)', () => {
  it.each([
    ['[Remote] Product Engineer na JotPsych', 'Product Engineer', 'JotPsych', 'Remote'],
    [
      '[Remoto] Desenvolvedor(a) Backend Pleno - White Label e Plataforma - Mimix AI',
      'Desenvolvedor(a) Backend Pleno - White Label e Plataforma',
      'Mimix AI',
      'Remoto',
    ],
    [
      '[Remoto] Desenvolvedor(a) Back-end Júnior - Python / AI Coding & Agentic AI - MKdigital',
      'Desenvolvedor(a) Back-end Júnior - Python / AI Coding & Agentic AI',
      'MKdigital',
      'Remoto',
    ],
    ['[Híbrido] Sr Software Engineer - Stealth', 'Sr Software Engineer', 'Stealth', 'Híbrido'],
    [
      '[Joinville/SC] Back-end ou Full Stack Developer (Node.js + React)',
      'Back-end ou Full Stack Developer (Node.js + React)',
      null,
      'Joinville/SC',
    ],
    [
      '[Híbrido / São Paulo, Brasil] Engenheiro de Software Backend Sênior (Híbrido, São Paulo) na Coodesh',
      'Engenheiro de Software Backend Sênior (Híbrido, São Paulo)',
      'Coodesh',
      'Híbrido / São Paulo, Brasil',
    ],
    [
      '[Belo Horizonte ou São Paulo, Brasil] Software Engineer, People with Disabilities na Google',
      'Software Engineer, People with Disabilities',
      'Google',
      'Belo Horizonte ou São Paulo, Brasil',
    ],
    [
      '[Belo Horizonte ou São Paulo, Brasil] Software Engineer (For Women in Tech Candidates) na Google',
      'Software Engineer (For Women in Tech Candidates)',
      'Google',
      'Belo Horizonte ou São Paulo, Brasil',
    ],
    ['[Remoto] Dev java junior - DB1', 'Dev java junior', 'DB1', 'Remoto'],
    [
      '[Remoto] Desenvolvedor Java Pleno - DB1/ANYMARKET',
      'Desenvolvedor Java Pleno',
      'DB1/ANYMARKET',
      'Remoto',
    ],
    [
      '[Remoto] Full-stack Engineer React.js • UX Design • Node.js (Strider)',
      'Full-stack Engineer React.js • UX Design • Node.js',
      'Strider',
      'Remoto',
    ],
    [
      '[Remoto] Senior Full-stack Engineer - React.js, Nest.js, Kafka(Strider))',
      'Senior Full-stack Engineer - React.js, Nest.js, Kafka',
      'Strider',
      'Remoto',
    ],
    ['[Remoto] Back-end developer Net- (Strider)', 'Back-end developer Net', 'Strider', 'Remoto'],
    [
      '[Remote] Senior Embedded Engineer - Jobsity',
      'Senior Embedded Engineer',
      'Jobsity',
      'Remote',
    ],
    [
      '[Híbrido] Desenvolvedor / Engenheiro de IA (AI Stack) - Programa AI Stack - Rio de Janeiro - RJ',
      'Desenvolvedor / Engenheiro de IA (AI Stack) - Programa AI Stack - Rio de Janeiro - RJ',
      null,
      'Híbrido',
    ],
  ])('%s', (raw, title, companyName, place) => {
    expect(parseIssueTitle(raw)).toEqual({ title, companyName, place })
  })

  it('does not take lowercase phrases as a company ("na área de dados")', () => {
    expect(parseIssueTitle('Analista na área de dados').companyName).toBeNull()
  })

  it('does not take a work mode as a company', () => {
    expect(parseIssueTitle('Dev Backend - Remoto').companyName).toBeNull()
  })

  it('works without a prefix', () => {
    expect(parseIssueTitle('Desenvolvedor Node.js - Acme')).toEqual({
      title: 'Desenvolvedor Node.js',
      companyName: 'Acme',
      place: null,
    })
  })
})

describe('parseSections', () => {
  const body = [
    '### Sobre a empresa',
    '',
    'Somos uma startup.',
    '',
    '### Faixa salarial',
    '',
    '_No response_',
    '',
    '### Como se candidatar:',
    '',
    'Envie para https://acme.com/vagas/123.',
  ].join('\n')

  it('maps headings to their content and drops empty form fields', () => {
    const sections = parseSections(body)

    expect(sections.get('sobre a empresa')).toBe('Somos uma startup.')
    expect(sections.has('faixa salarial')).toBe(false)
    expect(sections.get('como se candidatar')).toBe('Envie para https://acme.com/vagas/123.')
  })

  it('finds the first URL (without trailing punctuation)', () => {
    expect(firstUrl(parseSections(body).get('como se candidatar') ?? null)).toBe(
      'https://acme.com/vagas/123',
    )
    expect(firstUrl('Envie seu CV por e-mail')).toBeNull()
    // Real case: the sentence's colon ended up glued to the link
    expect(firstUrl('Apply at https://jotpsych.com/careers?utm_source=backendbr:')).toBe(
      'https://jotpsych.com/careers?utm_source=backendbr',
    )
  })
})

describe('labels and fields → structured fields', () => {
  it('reads seniority, work mode and contract from labels', () => {
    const labels = ['PJ', 'Sênior', 'Remoto', 'Node.js', 'verificada']

    expect(seniorityFrom(labels, null)).toBe('senior')
    expect(workModeFrom(labels)).toBe('remote')
    expect(employmentTypeFrom(labels, null)).toBe('contract')
  })

  it('falls back to free-text form fields', () => {
    expect(seniorityFrom([], 'Pleno')).toBe('mid')
    expect(employmentTypeFrom([], 'CLT')).toBe('full_time')
    expect(workModeFrom([], null, 'Híbrido (3x por semana)')).toBe('hybrid')
  })

  it('returns null when nothing matches', () => {
    expect(seniorityFrom(['Python'], 'Não informado')).toBeNull()
    expect(employmentTypeFrom(['Go'], null)).toBeNull()
  })
})
