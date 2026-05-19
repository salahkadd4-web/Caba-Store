'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const THRESHOLD = 72    // px to pull before release triggers refresh
const MAX_PULL  = 110   // max visual pull distance

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pullY,      setPullY]      = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [released,   setReleased]   = useState(false)   // true while snapping back / spinning

  const startY     = useRef(0)
  const isPulling  = useRef(false)
  const router     = useRouter()

  // ── Touch handlers ──────────────────────────────────────────────────────────

  const onTouchStart = useCallback((e: TouchEvent) => {
    // Déclencher uniquement depuis le haut de la page et pas pendant un refresh
    if (window.scrollY === 0 && !refreshing) {
      startY.current  = e.touches[0].clientY
      isPulling.current = true
    }
  }, [refreshing])

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || refreshing) return

    const delta = e.touches[0].clientY - startY.current

    if (delta <= 0) {
      // Scroll normal vers le haut → on annule le pull
      isPulling.current = false
      if (pullY > 0) setPullY(0)
      return
    }

    // Résistance progressive : plus on tire, plus c'est lent
    const resistance = delta < THRESHOLD ? 0.55 : 0.35
    const newY = Math.min(delta * resistance, MAX_PULL)
    setPullY(newY)

    // Empêcher le scroll natif seulement si on tire réellement
    if (delta > 8) e.preventDefault()
  }, [refreshing, pullY])

  const onTouchEnd = useCallback(() => {
    if (!isPulling.current) return
    isPulling.current = false

    if (pullY >= THRESHOLD) {
      // Seuil atteint → refresh
      setReleased(true)
      setRefreshing(true)
      setPullY(THRESHOLD * 0.75) // maintenir un peu visible

      router.refresh()

      setTimeout(() => {
        setRefreshing(false)
        setReleased(false)
        setPullY(0)
      }, 1200)
    } else {
      // Seuil non atteint → retour élastique
      setReleased(true)
      setPullY(0)
      setTimeout(() => setReleased(false), 300)
    }
  }, [pullY, router])

  // ── Event listeners ─────────────────────────────────────────────────────────

  useEffect(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove',  onTouchMove,  { passive: false })
    document.addEventListener('touchend',   onTouchEnd,   { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove',  onTouchMove)
      document.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onTouchStart, onTouchMove, onTouchEnd])

  // ── Derived values ───────────────────────────────────────────────────────────

  const progress       = Math.min(pullY / THRESHOLD, 1)
  const showIndicator  = pullY > 4 || refreshing
  const indicatorScale = refreshing ? 1 : 0.6 + progress * 0.4
  const indicatorY     = pullY > 0 ? pullY * 0.55 : refreshing ? THRESHOLD * 0.42 : 0

  return (
    <div style={{ position: 'relative', overflowX: 'hidden' }}>

      {/* ── Indicateur de rafraîchissement ───────────────────── */}
      <div
        aria-hidden
        style={{
          position:   'fixed',
          top:        57,                         // sous le header mobile fixe
          left:       '50%',
          transform:  `translateX(-50%) translateY(${indicatorY}px) scale(${indicatorScale})`,
          transition: released ? 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s' : 'none',
          opacity:    showIndicator ? 1 : 0,
          zIndex:     99,
          pointerEvents: 'none',
        }}
      >
        <div style={{
          width:        40,
          height:       40,
          borderRadius: '50%',
          background:   'var(--background, #fff)',
          boxShadow:    '0 2px 12px rgba(0,0,0,0.18)',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          border:       '1px solid rgba(0,0,0,0.06)',
        }}>
          {refreshing ? (
            /* Spinner actif */
            <svg
              className="ptr-spin"
              width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round"
              style={{ color: 'var(--foreground, #111)' }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            /* Flèche qui tourne selon la progression */
            <svg
              width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{
                color:      progress >= 1 ? '#22c55e' : 'var(--foreground, #111)',
                transform:  `rotate(${progress * 180}deg)`,
                transition: 'color 0.2s, transform 0.05s',
              }}
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          )}
        </div>

        {/* Texte hint */}
        <p style={{
          position:   'absolute',
          top:        '100%',
          left:       '50%',
          transform:  'translateX(-50%)',
          marginTop:  6,
          fontSize:   10,
          fontWeight: 500,
          color:      'var(--foreground, #111)',
          opacity:    0.45,
          whiteSpace: 'nowrap',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {refreshing ? 'Chargement…' : progress >= 1 ? 'Relâcher' : 'Tirer pour rafraîchir'}
        </p>
      </div>

      {/* ── Contenu décalé vers le bas lors du pull ──────────── */}
      <div
        style={{
          transform:  `translateY(${pullY}px)`,
          transition: released ? 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
}
