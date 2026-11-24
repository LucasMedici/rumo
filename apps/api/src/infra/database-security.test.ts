import { afterAll, describe, expect, it } from 'vitest'
import { createPrisma, DB_SCHEMA } from './prisma.js'

/**
 * Security guardrails checked against the real database (read-only queries).
 * Skipped when DATABASE_URL is not set (e.g. CI without database access).
 */
const databaseUrl = process.env.DATABASE_URL

describe.skipIf(!databaseUrl)('database security', () => {
  const prisma = createPrisma(databaseUrl ?? '')

  afterAll(() => prisma.$disconnect())

  it(`every table in the "${DB_SCHEMA}" schema has RLS enabled`, async () => {
    const tablesWithoutRls = await prisma.$queryRaw<{ table: string }[]>`
      SELECT c.relname AS "table"
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = ${DB_SCHEMA}
        AND c.relkind IN ('r', 'p')
        AND NOT c.relrowsecurity`

    expect(tablesWithoutRls).toEqual([])
  })

  it(`anon and authenticated cannot access the "${DB_SCHEMA}" schema`, async () => {
    const [access] = await prisma.$queryRaw<{ anon: boolean; authenticated: boolean }[]>`
      SELECT
        has_schema_privilege('anon', ${DB_SCHEMA}, 'USAGE') AS anon,
        has_schema_privilege('authenticated', ${DB_SCHEMA}, 'USAGE') AS authenticated`

    expect(access).toEqual({ anon: false, authenticated: false })
  })

  it('no application tables were created in the public schema', async () => {
    const publicTables = await prisma.$queryRaw<{ table: string }[]>`
      SELECT tablename AS "table" FROM pg_tables WHERE schemaname = 'public'`

    expect(publicTables).toEqual([])
  })
})
