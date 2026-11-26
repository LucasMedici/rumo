import { AppNav } from '@/components/app-nav'
import { Brand } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { signOut } from '@/features/auth/actions'
import { UserGreeting } from '@/features/identity/user-greeting'

/** Signed-in area. Access is gated by proxy.ts; data comes from the API with the user's token. */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="min-h-dvh bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Brand />
          <AppNav />
          <div className="ml-auto flex items-center gap-3">
            <UserGreeting />
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
