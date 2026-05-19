'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const THRESHOLD = 80   // px de traction pour déclencher le refresh

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [phase, setPhase]   = useState<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle')
  const [progress, setProgress] = useState(0)   // 0 → 1

  const startY      = useRef(0)
  const isPulling   = useRef(false)
  const router      = useRouter()

  // ── Handlers touch ──────────────────────────────────────────────────────────

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0 && phase === 'idle') {
      startY.current  = e.touches[0].clientY
      isPulling.current = true
    }
  }, [phase])

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current) return

    const delta = e.touches[0].clientY - startY.current
    if (delta <= 0) { isPulling.current = false; setPhase('idle'); setProgress(0); return }

    // Résistance : ratio logarithmique pour un effet naturel
    const ratio = Math.min(delta / THRESHOLD, 1.5)
    const prog  = Math.min(ratio, 1)

    setProgress(prog)
    setPhase(prog >= 1 ? 'ready' : 'pulling')

    if (delta > 10) e.preventDefault()
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!isPulling.current) return
    isPulling.current = false

    if (phase === 'ready') {
      setPhase('refreshing')
      setProgress(1)
      router.refresh()
      setTimeout(() => { setPhase('idle'); setProgress(0) }, 1400)
    } else {
      setPhase('idle')
      setProgress(0)
    }
  }, [phase, router])

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

  // ── Indicateur visuel (fixed, ne bouge pas le contenu) ──────────────────────

  const visible = phase !== 'idle'

  // L'indicateur glisse depuis le haut : -48px → 12px
  const indicatorY = visible
    ? (phase === 'refreshing' ? 12 : -48 + progress * 60)
    : -48

  return (
    <>
      {/* Bulle indicateur */}
      <div
        aria-hidden
        style={{
          position:   'fixed',
          top:        57,                   // sous le header mobile (57px)
          left:       '50%',
          transform:  `translateX(-50%) translateY(${indicatorY}px)`,
          transition: phase === 'refreshing' || phase === 'idle'
            ? 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s'
            : 'none',
          opacity:    visible ? 1 : 0,
          zIndex:     9999,
          pointerEvents: 'none',
        }}
      >
        <div style={{
          width:          40,
          height:         40,
          borderRadius:   '50%',
          background:     'var(--background, #fff)',
          boxShadow:      '0 3px 14px rgba(0,0,0,0.22)',
          border:         '1px solid rgba(128,128,128,0.15)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexDirection:  'column',
          gap:            2,
        }}>
          {phase === 'refreshing' ? (
            <svg className="ptr-spin" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ color: 'var(--foreground, #111)' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{
                color:     phase === 'ready' ? '#22c55e' : 'var(--foreground, #111)',
                transform: `rotate(${progress * 180}deg)`,
                transition:'color 0.2s',
              }}>
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          )}
        </div>
      </div>

      {/* Contenu — inchangé, pas de translateY */}
      {children}
    </>
  )
}