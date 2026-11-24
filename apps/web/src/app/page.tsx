import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ApiStatus } from '@/features/system/api-status'

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="font-semibold text-5xl tracking-tight">Rumo</h1>
      <p className="text-lg text-muted-foreground">Rumo à sua próxima vaga.</p>
      <div className="mt-6 flex gap-3">
        <Button size="lg" render={<Link href="/signup" />} nativeButton={false}>
          Criar conta
        </Button>
        <Button size="lg" variant="outline" render={<Link href="/login" />} nativeButton={false}>
          Entrar
        </Button>
      </div>
      <div className="mt-6">
        <ApiStatus />
      </div>
    </main>
  )
}
