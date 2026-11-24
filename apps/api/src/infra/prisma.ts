import { readFileSync } from 'node:fs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

/** Supabase's root CA: lets us verify the server certificate, not just encrypt the connection. */
const supabaseCa = readFileSync(new URL('../../certs/supabase-ca.crt', import.meta.url), 'utf8')

/** All application tables live in this schema (never exposed through Supabase's Data API). */
export const DB_SCHEMA = 'rumo'

export function createPrisma(databaseUrl: string) {
  const adapter = new PrismaPg(
    { connectionString: databaseUrl, ssl: { ca: supabaseCa, rejectUnauthorized: true } },
    { schema: DB_SCHEMA },
  )
  return new PrismaClient({ adapter })
}

export type Prisma = ReturnType<typeof createPrisma>
