'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

export default function ClearAdminSession() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const isMobile = useIsMobile()

  useEffect(() => {
    // Sur mobile, si session admin et pas sur page admin → déconnexion forcée
    if (
      isMobile &&
      status === 'authenticated' &&
      session?.user?.role === 'ADMIN' &&
      !pathname.startsWith('/admin')
    ) {
      signOut({ redirect: false }) // déconnexion silencieuse sans redirect
    }
  }, [session, status, pathname, isMobile])

  return null
}