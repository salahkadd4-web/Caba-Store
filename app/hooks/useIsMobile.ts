'use client'

import { useState, useEffect } from 'react'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(true) // ← true par défaut pour mobile-first

  useEffect(() => {
    const check = () => {
      // Détecte Capacitor (app native) ou petite fenêtre
      const isCapacitor = !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
      const isSmallScreen = window.innerWidth < 768
      setIsMobile(isCapacitor || isSmallScreen)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return isMobile
}

export function useHideOnScroll() {
  const [hidden, setHidden] = useState(false)
  const [lastY, setLastY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      setHidden(currentY > lastY && currentY > 60)
      setLastY(currentY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastY])

  return hidden
}
