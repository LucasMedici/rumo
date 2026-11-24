import { Brand } from '@/components/brand'

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-muted/40 px-4 py-12">
      <Brand />
      <div className="w-full max-w-sm">{children}</div>
    </main>
  )
}
