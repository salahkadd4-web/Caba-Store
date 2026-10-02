import type { Metadata } from "next";
import { Geist, IBM_Plex_Sans_Arabic } from 'next/font/google'
import "./globals.css";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/components/I18nProvider";
import SessionProvider from "@/components/client/SessionProvider";
import { EtatProduitsProvider } from "@/components/client/EtatProduitsProvider";
import Nav from "@/components/Nav";
import ThemeToggle from "@/components/ThemeToggle";
import BottomNav from "@/components/BottomNav";
import AndroidBackButton from "@/components/client/AndroidBackButton";
import PullToRefresh from "@/components/client/PullToRefresh";
import Footer from "@/components/Footer";
import FooterWrapper from "@/components/client/FooterWrapper";
import MainWrapper from "@/components/client/MainWrapper";
import { getI18n } from "@/lib/i18n/server";

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

// Police arabe : non préchargée, téléchargée uniquement quand la page est en arabe.
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-arabic',
  preload: false,
})

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return {
    title: t.common.appName,
    description: t.layout.metaDescription,
    icons: {
      icon: "/favicon.ico",
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, hdrs, { locale, dir, t }] = await Promise.all([auth(), headers(), getI18n()])
  const nonce = hdrs.get('x-nonce') ?? undefined

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#c2410c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={t.common.appName} />
        <link rel="apple-touch-icon" href="/icons/caba-store-icon-black.png" />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark')})()`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${plexArabic.variable} font-sans text-stone-900 dark:text-stone-100 transition-colors duration-300`}>
        <I18nProvider locale={locale}>
          <ThemeProvider>
            <SessionProvider session={session}>
              <EtatProduitsProvider>
                <AndroidBackButton />
              <Nav />
              <PullToRefresh>
                <MainWrapper>{children}</MainWrapper>
              </PullToRefresh>
              <BottomNav />
              <FooterWrapper><Footer /></FooterWrapper>
              <ThemeToggle />
              </EtatProduitsProvider>
            </SessionProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
