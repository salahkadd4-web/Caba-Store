import type { Metadata } from "next";
import { Geist } from 'next/font/google'
import "./globals.css";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { ThemeProvider } from "@/components/ThemeProvider";
import SessionProvider from "@/components/client/SessionProvider";
import Nav from "@/components/Nav";
import ThemeToggle from "@/components/ThemeToggle";
import BottomNav from "@/components/BottomNav";
import AndroidBackButton from "@/components/client/AndroidBackButton";
import PullToRefresh from "@/components/client/PullToRefresh";
import Footer from "@/components/Footer";
import FooterWrapper from "@/components/client/FooterWrapper";
import MainWrapper from "@/components/client/MainWrapper";
import OfflineDetector from '@/components/OfflineDetector'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: "Caba Store",
  description: "Votre boutique en ligne — Caba Store",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, hdrs] = await Promise.all([auth(), headers()])
  const nonce = hdrs.get('x-nonce') ?? undefined

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#c2410c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Caba Store" />
        <link rel="apple-touch-icon" href="/icons/caba-store-icon-black.png" />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark')})()`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} font-sans text-stone-900 dark:text-stone-100 transition-colors duration-300`}>
        <ThemeProvider>
         <OfflineDetector> 
          <SessionProvider session={session}>
            <AndroidBackButton />
            <Nav />
            <PullToRefresh>
              <MainWrapper>{children}</MainWrapper>
            </PullToRefresh>
            <BottomNav />
            <FooterWrapper><Footer /></FooterWrapper>
            <ThemeToggle />
          </SessionProvider>
         </OfflineDetector> 
        </ThemeProvider>
      </body>
    </html>
  );
}
