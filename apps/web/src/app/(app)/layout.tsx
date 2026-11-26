import { AppSidebar } from '@/components/app-sidebar'
import { Brand } from '@/components/brand'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

/** Signed-in area (hub layout). Access is gated by proxy.ts; data comes from the API. */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur md:border-b-0 md:bg-transparent md:backdrop-blur-none">
            <SidebarTrigger aria-label="Abrir ou recolher o menu" />
            <span className="md:hidden">
              <Brand />
            </span>
          </header>
          <div className="mx-auto w-full max-w-5xl px-4 pt-2 pb-10 md:px-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
