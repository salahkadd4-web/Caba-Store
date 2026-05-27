import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/auth";
import { ThemeProvider } from "@/components/ThemeProvider";
import SessionProvider from "@/components/client/SessionProvider";
import Header from "@/components/Header";
import ThemeToggle from "@/components/ThemeToggle";
import BottomNav from "@/components/BottomNav";
import AndroidBackButton from "@/components/client/AndroidBackButton";
import PullToRefresh from "@/components/client/PullToRefresh";

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
  const session = await auth();

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#c2410c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Caba Store" />
        <link rel="apple-touch-icon" href="/icons/caba-store-icon-black.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
    (function() {
      var theme = localStorage.getItem('theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    })();
  `,
          }}
        />
      </head>
      <body className=" text-stone-900 dark:text-stone-100 transition-colors duration-300">
        <ThemeProvider>
          <SessionProvider session={session}>
            <AndroidBackButton />
            <Header />
            <PullToRefresh>
              <main className="pb-16 md:pb-0">{children}</main>
            </PullToRefresh>
            <BottomNav />
            <ThemeToggle />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
