import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3333),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, 'must be a postgresql:// connection string'),
  SUPABASE_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
  /** Max requests per IP per minute (all routes). */
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  /**
   * Trust X-Forwarded-For to get the client IP. Enable ONLY behind a reverse proxy/load balancer
   * (e.g. in production); otherwise clients could spoof their IP and bypass the rate limit.
   */
  TRUST_PROXY: z.stringbool().default(false),
  /** Optional GitHub token (no scopes needed) to raise the API limit from 60 to 5,000 req/hour. */
  GITHUB_TOKEN: z.string().trim().min(1).optional(),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    console.error('Invalid environment variables:\n', z.prettifyError(result.error))
    process.exit(1)
  }
  return result.data
}
