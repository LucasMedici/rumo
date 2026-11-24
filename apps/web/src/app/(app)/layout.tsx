import { Brand } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { signOut } from '@/features/auth/actions'

/** Signed-in area. Access is gated by proxy.ts; data comes from the API with the user's token. */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="min-h-dvh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Brand />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
