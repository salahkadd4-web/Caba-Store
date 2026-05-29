'use client'

import { useEffect, useState } from 'react'
import OfflinePage from './OfflinePage'

/**
 * OfflineDetector
 * ─────────────────────────────────────────────────────────────
 * Enveloppe toute l'app et remplace le contenu par <OfflinePage>
 * dès que le réseau devient inaccessible, puis le restaure
 * automatiquement quand la connexion revient.
 *
 * Stratégie à deux niveaux :
 *   1. navigator.onLine   — réaction instantanée (events online/offline)
 *   2. fetch vers /api/ping — vérification réelle toutes les 8 s
 *      quand le navigateur pense être hors ligne ou lors d'une
 *      reconnexion, pour éviter les faux positifs/négatifs.
 *
 * Usage : placer dans app/layout.tsx autour des children.
 */
export default function OfflineDetector({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false)

  /** Vérifie la connectivité réelle via un HEAD request léger */
  const checkConnectivity = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      })
      return res.ok
    } catch {
      return false
    }
  }

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    const goOffline = () => setIsOffline(true)
    const goOnline  = async () => {
      // Confirme avant d'afficher le contenu
      const ok = await checkConnectivity()
      if (ok) setIsOffline(false)
    }

    // Vérification initiale silencieuse (utile au démarrage Capacitor hors réseau)
    checkConnectivity().then(ok => {
      if (!ok) setIsOffline(true)
    })

    // Events navigateur
    window.addEventListener('offline', goOffline)
    window.addEventListener('online',  goOnline)

    // Polling léger quand hors-ligne pour détecter le retour réseau
    intervalId = setInterval(async () => {
      if (!navigator.onLine) return          // déjà offline, on attend l'event
      const ok = await checkConnectivity()
      if (!ok) setIsOffline(true)
      else     setIsOffline(false)
    }, 8_000)

    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online',  goOnline)
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  if (isOffline) return <OfflinePage />
  return <>{children}</>
}
