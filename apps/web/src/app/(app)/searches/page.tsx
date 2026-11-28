import type { Metadata } from 'next'
import { FeedsView } from '@/features/feeds/components/feeds-view'

export const metadata: Metadata = { title: 'Buscas · Rumo' }

export default function SearchesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <FeedsView />
    </div>
  )
}
