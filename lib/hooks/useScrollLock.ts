'use client'
import { useEffect } from 'react'

/**
 * Bloque le scroll du body quand `locked` est true.
 * Préserve la position de scroll et compense la scrollbar pour éviter le layout shift.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    const scrollY = window.scrollY
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow   = 'hidden'
    document.body.style.position   = 'fixed'
    document.body.style.top        = `-${scrollY}px`
    document.body.style.left       = '0'
    document.body.style.right      = '0'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      document.body.style.overflow     = ''
      document.body.style.position     = ''
      document.body.style.top          = ''
      document.body.style.left         = ''
      document.body.style.right        = ''
      document.body.style.paddingRight = ''
      window.scrollTo(0, scrollY)
    }
  }, [locked])
}
