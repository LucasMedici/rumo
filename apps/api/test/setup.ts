import { existsSync } from 'node:fs'

// Integration tests read DATABASE_URL from apps/api/.env when it exists (locally).
// In CI without a database, those tests are skipped.
if (existsSync('.env')) process.loadEnvFile('.env')
