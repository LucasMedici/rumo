import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'prisma/config'

// Prisma 7 no longer loads .env automatically; use Node's built-in loader when the file exists.
if (existsSync('.env')) process.loadEnvFile('.env')

/**
 * Prisma CLI (migrate, studio) connects through its own engine, so TLS is configured via URL params:
 * - schema=rumo: app tables (and _prisma_migrations) live in the `rumo` schema, never in `public`
 * - sslmode=require + sslcert + sslaccept=strict: encrypted AND verified against Supabase's CA
 *   (sslcert must be an absolute path)
 * The runtime client (src/infra/prisma.ts) uses the pg adapter with the same CA.
 *
 * DATABASE_URL is optional here so `prisma generate` works without a database (e.g. in CI).
 */
function migrationUrl(): string | undefined {
  const raw = process.env.DATABASE_URL
  if (!raw) return undefined
  const url = new URL(raw)
  url.searchParams.set('schema', 'rumo')
  url.searchParams.set('sslmode', 'require')
  url.searchParams.set(
    'sslcert',
    fileURLToPath(new URL('./certs/supabase-ca.crt', import.meta.url)),
  )
  url.searchParams.set('sslaccept', 'strict')
  return url.toString()
}

const url = migrationUrl()

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  ...(url && { datasource: { url } }),
})
