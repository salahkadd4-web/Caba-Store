'use client'

import { usePathname } from 'next/navigation'
import { useIsMobile } from '@/app/hooks/useIsMobile'
import PullToRefresh from '@/components/client/PullToRefresh'

export default function MobilePageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMobile = useIsMobile()

  // La page d'accueil (/) commence par une section plein écran noire, pas de padding-top
  const isHomePage = pathname === '/'
  // Les pages d'auth n'ont pas de Header mobile, donc pas de padding-top
  const isAuthPage = pathname?.startsWith('/connexion') || pathname?.startsWith('/inscription')

  const content = (
    <div className={isMobile && !isHomePage && !isAuthPage ? 'pt-[57px]' : ''}>
      {children}
    </div>
  )

  // Pull-to-refresh uniquement sur mobile, hors pages d'auth
  if (isMobile && !isAuthPage) {
    return <PullToRefresh>{content}</PullToRefresh>
  }

  return content
}