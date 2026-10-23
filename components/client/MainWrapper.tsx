'use client'

import { usePathname } from 'next/navigation'
import { useSession }  from 'next-auth/react'
import { isAuthPath } from '@/lib/auth-paths'

/**
 * Wrapper du <main> racine.
 * - Pages client : pb-16 md:pb-0 (espace pour BottomNav mobile)
 * - Pages dashboard (admin/vendeur) : pas de padding, le DashboardShell
 *   gère son propre layout interne
 */
export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname        = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role as string | undefined

  const isDashboard =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/vendeur') ||
    ((pathname?.startsWith('/commandes') || pathname?.startsWith('/retours')) &&
      (role === 'ADMIN' || role === 'VENDEUR'))

  // Pas de barre du bas sur les dashboards ni sur les pages de compte
  return (
    <main className={isDashboard || isAuthPath(pathname) ? '' : 'pb-16 md:pb-0'}>
      {children}
    </main>
  )
}
