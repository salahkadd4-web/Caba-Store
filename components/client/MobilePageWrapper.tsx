'use client'

import { usePathname } from 'next/navigation'
import { useIsMobile } from '@/app/hooks/useIsMobile'

export default function MobilePageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMobile = useIsMobile()

  const isHomePage = pathname === '/'
  const isAuthPage = pathname?.startsWith('/connexion') || pathname?.startsWith('/inscription')

  return (
    <div className={isMobile && !isHomePage && !isAuthPage ? 'pt-14.25' : ''}>
      {children}
    </div>
  )
}