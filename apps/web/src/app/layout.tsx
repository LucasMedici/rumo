import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rumo',
  description: 'Rumo à sua próxima vaga.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR">
      <body className="bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  )
}
