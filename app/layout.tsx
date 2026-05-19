import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import SessionProvider from '@/components/client/SessionProvider'
import Header from '@/components/client/Header'
import ThemeToggle from '@/components/ThemeToggle'
import BottomNav from '@/components/BottomNav'
import AndroidBackButton from '@/components/client/AndroidBackButton'
import PullToRefresh from '@/components/client/PullToRefresh'

export const metadata: Metadata = {
  title: 'Caba Store',
  description: 'Votre boutique en ligne — Caba Store',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192.webp',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Caba Store" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var theme = localStorage.getItem('theme');
              var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (theme === 'dark' || (theme === 'system' && systemDark) || (!theme && systemDark)) {
                document.documentElement.classList.add('dark');
              }
            })();
          `
        }} />
      </head>
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <ThemeProvider>
          <SessionProvider>
            <AndroidBackButton />
            <Header />
            <PullToRefresh>
              <main className="pb-16 md:pb-0">
                {children}
              </main>
            </PullToRefresh>
            <BottomNav />
            <ThemeToggle />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}