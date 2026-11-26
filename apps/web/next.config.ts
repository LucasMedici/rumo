import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

const origin = (url: string | undefined) => (url ? new URL(url).origin : '')
const apiOrigin = origin(process.env.NEXT_PUBLIC_API_URL)
const supabaseOrigin = origin(process.env.NEXT_PUBLIC_SUPABASE_URL)

/**
 * Content Security Policy without nonces (keeps pages static, see the Next.js CSP guide).
 * - connect-src: our API and Supabase Auth only (+ HMR websocket in dev)
 * - form-action: OAuth sign-in may redirect a form submission to Supabase → GitHub/Google
 * - frame-ancestors 'none': the app can't be embedded in iframes (clickjacking)
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin} ${supabaseOrigin}${isDev ? ' ws:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self' ${supabaseOrigin} https://github.com https://accounts.google.com`,
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The Interview Simulator (future) will need `microphone=(self)`.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  ...(isDev
    ? []
    : [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      ]),
]

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
