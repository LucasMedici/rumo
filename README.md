<div align="center">

# Rumo

### Your next job, on course.

**Find the right openings, prepare with purpose and land the job — all in one place.**

[![Status](https://img.shields.io/badge/status-in%20development-orange?style=flat-square)](#roadmap)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-000000?style=flat-square&logo=fastify&logoColor=white)](https://fastify.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)

[Overview](#overview) • [Features](#features) • [How it works](#how-it-works) • [Tech stack](#tech-stack) • [Roadmap](#roadmap) • [Getting started](#getting-started)

**English** | [Português](docs/README.pt-BR.md)

</div>

> [!NOTE]
> Rumo is in early development. The first module being built is the **Job Finder**.

## Overview

Job hunting today means ten open tabs, the same search repeated across different sites, good openings buried under duplicate or suspicious listings — and, in the end, the same generic resume sent everywhere.

**Rumo** is a career hub that covers the whole journey:

- **Discover** — openings from Brazil and abroad, from many sources, in one place, with no duplicates.
- **Decide** — every opening gets a quality score and a profile-fit score, with the reasons spelled out.
- **Prepare** — an ATS-friendly resume tailored to each opening and voice mock interviews with AI *(coming soon)*.

## Features

### Job Finder — *in development*

- **Unified search** across national and international sources: company ATS boards (Greenhouse, Lever, Ashby), aggregators (Adzuna, Remotive and more), Hacker News and Brazilian developer communities on GitHub.
- **Smart deduplication**: the same opening posted in several places shows up only once.
- **Job Quality Score**: flags incomplete, stale or potentially fraudulent listings.
- **Candidate Match Score**: shows how well an opening fits your skills, seniority, location and goals — and what's missing.
- **Rich filters**: title, technologies, seniority, country, work mode, salary and custom criteria.
- **Favorites and application tracking**, with the full history of every process.

> [!TIP]
> The two scores are independent on purpose: a great opening may not be right for you — and a perfect fit may be a dubious listing. Rumo shows you both.

### Resume Generator — *next*

ATS-optimized resumes tailored to each opening, built **from your real experience**. Rumo highlights what matters, uses the right keywords and shows which requirements are covered — without ever making anything up.

### Interview Simulator — *planned*

Real-time voice mock interviews in Portuguese and English, based on the opening and on your resume. You get a report covering strengths, technical mistakes, knowledge gaps, communication, English pronunciation and vocabulary, plus a study plan.

## How it works

```mermaid
flowchart LR
    A[Job sources] --> B[Adapters]
    B --> C[Normalization]
    C --> D[Deduplication]
    D --> E[Quality Score]
    E --> F[Match Score]
    F --> G[Your job board]
```

1. Each source has an **isolated adapter** that converts its data into a standard format.
2. Openings are **normalized** (title, company, location, salary, skills) and **deduplicated** across sources.
3. Each opening gets a **Quality Score**; each user gets a **Match Score** with a per-criterion breakdown.
4. You filter, favorite and track your applications from the dashboard.

> [!IMPORTANT]
> Rumo only uses official APIs, public feeds and authorized integrations, respecting each provider's terms of use.

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript, TanStack Query, Tailwind CSS |
| Backend | Node.js, Fastify, TypeScript, Zod |
| Data | PostgreSQL (Supabase), Prisma, pg-boss |
| Auth | Supabase Auth — email and password, GitHub and Google |
| Quality | Vitest, Biome, GitHub Actions |

A **modular monolith** in a pnpm monorepo, decoupled from the infrastructure provider and designed to grow into a SaaS.

```
rumo/
├── apps/
│   ├── web/          # Next.js
│   └── api/          # Fastify (API + worker)
└── packages/
    ├── contracts/    # shared Zod schemas
    └── config/       # shared base config
```

## Roadmap

- [x] Monorepo foundation (pnpm, Biome, TypeScript)
- [x] API and web skeletons with shared contracts
- [x] Database (Supabase + Prisma), security baseline and CI
- [x] Authentication (email and password, GitHub, Google) with API hardening
- [x] Job model, manual import, job list and detail
- [x] First job sources (Remotive, Brazilian GitHub job boards), saved searches and the Discover screen
- [ ] Scheduled ingestion, Himalayas and company ATS boards (Greenhouse, Lever, Ashby)
- [ ] Search and filters
- [ ] Cross-source deduplication
- [ ] Favorites and application tracking
- [ ] Professional profile and skills taxonomy
- [ ] Job Quality Score
- [ ] Candidate Match Score
- [ ] Resume Generator
- [ ] Interview Simulator

## Getting started

**Prerequisites:** [Node.js 24 LTS](https://nodejs.org/), [pnpm](https://pnpm.io/) and a [Supabase](https://supabase.com/) project.

```bash
git clone https://github.com/LucasMedici/rumo.git
cd rumo
pnpm install
cp apps/api/.env.example apps/api/.env      # set DATABASE_URL (Supabase → Connect → Session pooler)
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @rumo/api db:migrate          # apply database migrations
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3333/health

> [!IMPORTANT]
> In your Supabase project, enable **Enforce SSL** (Database → Settings) and keep the **Data API** exposing only the `public` schema (Project Settings → Data API) — never expose `rumo`. Don't disable it: PostgREST keeps running and logs an error every ~30s. The API connects with TLS verified against Supabase's root CA (`apps/api/certs/supabase-ca.crt`).

Run the checks with `pnpm lint`, `pnpm typecheck` and `pnpm test`.

<div align="center">

**Rumo** — Your next job, on course.

</div>
