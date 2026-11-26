import type { ImportJobInput } from '@rumo/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Prisma } from '../../infra/prisma.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors.js'
import { JobsService } from './jobs.service.js'

const USER_ID = '7b0c5a1e-3f2d-4c8b-9a6e-1d2f3a4b5c6d'
const OTHER_USER = '11111111-2222-4333-8444-555555555555'
const JOB_ID = '019abc12-3456-7def-8123-456789abcdef'
const COMPANY_ID = '019abc12-0000-7def-8123-456789abcdef'
const NOW = new Date('2026-11-25T12:00:00Z')

function jobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: JOB_ID,
    companyId: COMPANY_ID,
    title: 'Backend Engineer',
    description: 'Build APIs with Node.js and Postgres.',
    locationText: null,
    countryCode: null,
    workMode: null,
    seniority: null,
    employmentType: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    applyUrl: null,
    status: 'open',
    postedAt: null,
    firstSeenAt: NOW,
    lastSeenAt: NOW,
    closedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    company: { id: COMPANY_ID, name: 'Acme', normalizedName: 'acme' },
    listings: [
      {
        sourceKey: 'manual',
        importedByUserId: USER_ID,
        url: null,
        source: { key: 'manual', name: 'Manual import' },
      },
    ],
    ...overrides,
  }
}

function userJobRow(jobOverrides: Record<string, unknown> = {}, jobId = JOB_ID) {
  return {
    userId: USER_ID,
    jobId,
    origin: 'imported',
    createdAt: NOW,
    job: jobRow({ id: jobId, ...jobOverrides }),
  }
}

function fakePrisma() {
  const db = {
    company: { upsert: vi.fn().mockResolvedValue({ id: COMPANY_ID }) },
    job: {
      create: vi.fn().mockResolvedValue({ id: JOB_ID }),
      update: vi.fn().mockResolvedValue({}),
    },
    jobListing: {
      create: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    userJob: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(userJobRow()),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: vi.fn(),
  }
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db))
  return db
}

let db: ReturnType<typeof fakePrisma>
let service: JobsService
beforeEach(() => {
  db = fakePrisma()
  service = new JobsService(db as unknown as Prisma)
})

describe('importManual', () => {
  const input: ImportJobInput = {
    title: 'Backend Engineer',
    companyName: '  Acme,   Inc. ',
    description: 'Build APIs with Node.js and Postgres.',
    applyUrl: 'https://acme.com/jobs/1',
  }

  it('upserts the company by normalized name, keeping a clean display name', async () => {
    await service.importManual(USER_ID, input)

    expect(db.company.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { normalizedName: 'acme' },
        create: { name: 'Acme, Inc.', normalizedName: 'acme' },
        update: {},
      }),
    )
  })

  it('creates job, manual listing and user link in one transaction', async () => {
    await service.importManual(USER_ID, input)

    expect(db.$transaction).toHaveBeenCalledTimes(1)
    expect(db.job.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: COMPANY_ID,
        title: 'Backend Engineer',
        applyUrl: 'https://acme.com/jobs/1',
        workMode: null,
        salaryMin: null,
      }),
    })
    expect(db.jobListing.create).toHaveBeenCalledWith({
      data: {
        jobId: JOB_ID,
        sourceKey: 'manual',
        externalId: JOB_ID,
        url: 'https://acme.com/jobs/1',
        importedByUserId: USER_ID,
      },
    })
    expect(db.userJob.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, jobId: JOB_ID, origin: 'imported' },
    })
  })

  it('returns the created job as editable', async () => {
    const job = await service.importManual(USER_ID, input)

    expect(job).toMatchObject({ id: JOB_ID, editable: true, company: { name: 'Acme' } })
  })
})

describe('listForUser', () => {
  const ids = [
    '019abc12-0000-7000-8000-000000000003',
    '019abc12-0000-7000-8000-000000000002',
    '019abc12-0000-7000-8000-000000000001',
  ]

  it('returns a next cursor when there are more items', async () => {
    db.userJob.findMany.mockResolvedValue(ids.map((id) => userJobRow({}, id)))

    const page = await service.listForUser(USER_ID, { limit: 2 })

    expect(page.items.map((job) => job.id)).toEqual(ids.slice(0, 2))
    expect(page.nextCursor).toBe(ids[1])
    expect(db.userJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID }, take: 3 }),
    )
  })

  it('returns no cursor on the last page', async () => {
    db.userJob.findMany.mockResolvedValue(ids.slice(0, 1).map((id) => userJobRow({}, id)))

    const page = await service.listForUser(USER_ID, { limit: 2 })

    expect(page.nextCursor).toBeNull()
  })

  it('continues after the cursor, scoped to the user', async () => {
    await service.listForUser(USER_ID, { limit: 2, cursor: ids[1] })

    expect(db.userJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { userId_jobId: { userId: USER_ID, jobId: ids[1] } },
        skip: 1,
      }),
    )
  })

  it('builds the salary only when amount, currency and period exist', async () => {
    db.userJob.findMany.mockResolvedValue([
      userJobRow({ salaryMin: 8000, salaryCurrency: 'BRL', salaryPeriod: 'month' }, ids[0]),
      userJobRow({ salaryCurrency: 'BRL', salaryPeriod: 'month' }, ids[1]),
    ])

    const { items } = await service.listForUser(USER_ID, { limit: 10 })

    expect(items[0]?.salary).toEqual({ min: 8000, max: null, currency: 'BRL', period: 'month' })
    expect(items[1]?.salary).toBeNull()
  })
})

describe('getForUser', () => {
  it('throws NotFound when the job is not in the user list', async () => {
    db.userJob.findUnique.mockResolvedValue(null)

    await expect(service.getForUser(USER_ID, JOB_ID)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('is not editable when the job came from another source or another user', async () => {
    db.userJob.findUnique.mockResolvedValue(
      userJobRow({
        listings: [
          {
            sourceKey: 'manual',
            importedByUserId: OTHER_USER,
            url: null,
            source: { key: 'manual', name: 'Manual import' },
          },
          {
            sourceKey: 'greenhouse',
            importedByUserId: null,
            url: 'https://x',
            source: { key: 'greenhouse', name: 'Greenhouse' },
          },
        ],
      }),
    )

    const job = await service.getForUser(USER_ID, JOB_ID)

    expect(job.editable).toBe(false)
    expect(job.sources.map((s) => s.key)).toEqual(['manual', 'greenhouse'])
  })
})

describe('updateManual', () => {
  it('updates only the provided fields', async () => {
    await service.updateManual(USER_ID, JOB_ID, { seniority: 'senior', locationText: null })

    expect(db.job.update).toHaveBeenCalledWith({
      where: { id: JOB_ID },
      data: { seniority: 'senior', locationText: null, companyId: undefined },
    })
    expect(db.company.upsert).not.toHaveBeenCalled()
    expect(db.jobListing.updateMany).not.toHaveBeenCalled()
  })

  it('switches company and syncs the manual listing url', async () => {
    await service.updateManual(USER_ID, JOB_ID, {
      companyName: 'Globex',
      applyUrl: 'https://globex.com/jobs/2',
    })

    expect(db.company.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { normalizedName: 'globex' } }),
    )
    expect(db.jobListing.updateMany).toHaveBeenCalledWith({
      where: { jobId: JOB_ID, sourceKey: 'manual', importedByUserId: USER_ID },
      data: { url: 'https://globex.com/jobs/2' },
    })
  })

  it('validates the salary merged with the stored values', async () => {
    db.userJob.findUnique.mockResolvedValue(
      userJobRow({
        salaryMin: 10000,
        salaryMax: 12000,
        salaryCurrency: 'BRL',
        salaryPeriod: 'month',
      }),
    )

    await expect(
      service.updateManual(USER_ID, JOB_ID, { salaryMin: 15000 }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      service.updateManual(USER_ID, JOB_ID, { salaryCurrency: null }),
    ).rejects.toBeInstanceOf(ValidationError)
    expect(db.job.update).not.toHaveBeenCalled()
  })

  it('refuses to edit jobs the user did not import', async () => {
    db.userJob.findUnique.mockResolvedValue(
      userJobRow({
        listings: [
          {
            sourceKey: 'greenhouse',
            importedByUserId: null,
            url: null,
            source: { key: 'greenhouse', name: 'Greenhouse' },
          },
        ],
      }),
    )

    await expect(service.updateManual(USER_ID, JOB_ID, { title: 'Hacked' })).rejects.toBeInstanceOf(
      ForbiddenError,
    )
    expect(db.job.update).not.toHaveBeenCalled()
  })
})

describe('removeFromUser', () => {
  it('deletes only the user link', async () => {
    await service.removeFromUser(USER_ID, JOB_ID)

    expect(db.userJob.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, jobId: JOB_ID },
    })
  })

  it('throws NotFound when the job was not in the list', async () => {
    db.userJob.deleteMany.mockResolvedValue({ count: 0 })

    await expect(service.removeFromUser(USER_ID, JOB_ID)).rejects.toBeInstanceOf(NotFoundError)
  })
})
