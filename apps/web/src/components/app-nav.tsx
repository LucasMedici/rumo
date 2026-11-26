'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { cn } from '@/lib/utils'

const LINKS = [{ href: '/jobs', label: 'Vagas' }]

/**
 * Main navigation. Reading the pathname is request-time data on dynamic routes, so the
 * active-state version streams in behind Suspense; the fallback renders the same links.
 */
export function AppNav() {
  return (
    <Suspense fallback={<NavLinks pathname={null} />}>
      <ActiveNavLinks />
    </Suspense>
  )
}

function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />
}

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Principal" className="flex items-center gap-1">
      {LINKS.map(({ href, label }) => {
        const active = pathname !== null && (pathname === href || pathname.startsWith(`${href}/`))
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted',
              active ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
