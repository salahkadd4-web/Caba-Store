'use client'

import { usePathname } from 'next/navigation'
import { useSession }  from 'next-auth/react'

/**
 * Masque ses enfants (le Footer) sur les routes dashboard :
 *  - /admin/**
 *  - /vendeur/**
 *  - /commandes et /retours pour les rôles ADMIN et VENDEUR
 */
export default function FooterWrapper({ children }: { children: React.ReactNode }) {
  const pathname        = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role as string | undefined

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
