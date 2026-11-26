import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Geist } from 'next/font/google'
import { themeScript } from '@/lib/theme-script'
import { cn } from '@/lib/utils'
import { Providers } from './providers'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Rumo',
  description: 'Rumo à sua próxima vaga.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8f7' },
    { media: '(prefers-color-scheme: dark)', color: '#18181b' },
  ],
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // suppressHydrationWarning: the theme script may add `dark` to <html> before React hydrates.
    <html lang="pt-BR" className={cn('font-sans', geist.variable)} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, first-party theme script (no user input) */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
