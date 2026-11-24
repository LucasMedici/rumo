import type { Metadata } from 'next'
import { MeCard } from '@/features/identity/me-card'

export const metadata: Metadata = { title: 'Painel · Rumo' }

export default function DashboardPage() {
  return (
    <div className="max-w-xl">
      <MeCard />
    </div>
  )
}
