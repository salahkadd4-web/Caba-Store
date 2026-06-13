'use client'

import { useEffect } from 'react'

// Compteur global — plusieurs modals peuvent être ouverts simultanément
// Le body reste bloqué tant qu'au moins un modal est ouvert
let lockCount = 0
let scrollY   = 0

function lockBody() {
  if (lockCount === 0) {
    // Mémoriser la position de scroll actuelle
    scrollY = window.scrollY
    document.body.style.position   = 'fixed'
    document.body.style.top        = `-${scrollY}px`
    document.body.style.left       = '0'
    document.body.style.right      = '0'
    document.body.style.overflowY  = 'hidden'
    document.body.style.touchAction = 'none'
  }
  lockCount++
}

function unlockBody() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.position   = ''
    document.body.style.top        = ''
    document.body.style.left       = ''
    document.body.style.right      = ''
    document.body.style.overflowY  = ''
    document.body.style.touchAction = ''
    // Restaurer la position de scroll
    window.scrollTo({ top: scrollY, behavior: 'instant' })
  }
}

/**
 * Verrouille le scroll du body quand `locked` est true.
 * Utiliser dans tous les modals / bottom sheets.
 * 
 * Usage:
 *   useBodyLock(isOpen)
 */
export function useBodyLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    lockBody()
    return () => unlockBody()
  }, [locked])
}