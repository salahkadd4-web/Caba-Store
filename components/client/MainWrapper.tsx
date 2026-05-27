'use client'

import { usePathname } from 'next/navigation'
import { useSession }  from 'next-auth/react'

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

  return (
    <main className={isDashboard ? '' : 'pb-16 md:pb-0'}>
      {children}
    </main>
  )
}
