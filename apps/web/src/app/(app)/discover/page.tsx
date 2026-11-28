import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DiscoverView } from '@/features/discover/components/discover-view'

export const metadata: Metadata = { title: 'Descobrir · Rumo' }

export default function DiscoverPage() {
  return (
    <div className="mx-auto max-w-7xl">
      {/* DiscoverView reads the selected job from the URL (?job=), which is request-time data. */}
      <Suspense>
        <DiscoverView />
      </Suspense>
    </div>
  )
}
