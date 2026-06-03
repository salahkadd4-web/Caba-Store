'use client'

import { usePathname } from 'next/navigation'
import { useSession }  from 'next-auth/react'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

/**
 * Masque ses enfants (le Footer) :
 *  - Sur les routes dashboard : /admin/**, /vendeur/**
 *  - Sur /commandes et /retours pour les rôles ADMIN et VENDEUR
 *  - Sur mobile (toutes les pages)
 */
export default function FooterWrapper({ children }: { children: React.ReactNode }) {
  const pathname          = usePathname()
  const { data: session } = useSession()
  const isMobile          = useIsMobile()
  const role = session?.user?.role as string | undefined

  // Masquer sur mobile
  if (isMobile) return null

  // Pages dashboard avec sidebar propre
  if (pathname?.startsWith('/admin'))   return null
  if (pathname?.startsWith('/vendeur')) return null

  // /commandes et /retours sont dashboard pour admin/vendeur
  if (
    (pathname?.startsWith('/commandes') || pathname?.startsWith('/retours')) &&
    (role === 'ADMIN' || role === 'VENDEUR')
  ) return null

  return <>{children}</>
}
