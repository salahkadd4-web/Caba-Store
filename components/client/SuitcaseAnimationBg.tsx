'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

// ─── Types ───────────────────────────────────────────────────────────────────
type Mode        = 'intro' | 'scroll'
type IntroPhase  = 'closed' | 'shimmer' | 'opening' | 'open'

interface Particle {
  id: number; x: number; y: number; size: number
  duration: number; delay: number; opacity: number
}

function generateParticles(n: number): Particle[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1.5,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
    opacity: Math.random() * 0.3 + 0.1,
  }))
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function SuitcaseAnimationBg() {
  const containerRef  = useRef<HTMLDivElement>(null)
  const timers        = useRef<ReturnType<typeof setTimeout>[]>([])

  const [mode,         setMode]         = useState<Mode>('intro')
  const [introPhase,   setIntroPhase]   = useState<IntroPhase>('closed')
  const [scrollProgress, setScrollProgress] = useState(0) // 0 = ouvert, 1 = fermé
  const [particles]   = useState<Particle[]>(() => generateParticles(18))

  // ── Intro : joue une seule fois au montage ──────────────────────────────
  useEffect(() => {
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms)
      timers.current.push(t)
    }

    schedule(() => setIntroPhase('shimmer'), 1800)
    schedule(() => setIntroPhase('opening'), 2800)
    schedule(() => setIntroPhase('open'),    3500)
    // Après l'intro → mode scroll (valise reste ouverte jusqu'au 1er scroll)
    schedule(() => setMode('scroll'),        4200)

    return () => timers.current.forEach(clearTimeout)
  }, [])

  // ── Scroll : pilote l'animation après l'intro ───────────────────────────
  useEffect(() => {
    if (mode !== 'scroll') return

    const handleScroll = () => {
      const el = containerRef.current
      if (!el) return

      // Remonte jusqu'à la <section> parente
      const section = el.closest('section') as HTMLElement | null
      if (!section) return

      const scrollY       = window.scrollY
      const sectionTop    = section.offsetTop
      const closingRange  = section.offsetHeight * 0.55 // se ferme sur 55% de la hauteur

      // progress : 0 = haut de la section (ouvert), 1 = fermé
      const raw = (scrollY - sectionTop) / closingRange
      setScrollProgress(Math.max(0, Math.min(1, raw)))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // état initial

    return () => window.removeEventListener('scroll', handleScroll)
  }, [mode])

  // ── Valeurs dérivées ────────────────────────────────────────────────────

  // --- Mode intro ---
  const introClosedOpacity = introPhase === 'closed' || introPhase === 'shimmer' ? 1 : 0
  const introOpenOpacity   = introPhase === 'open' ? 1 : introPhase === 'opening' ? 0.85 : 0
  const introClosedScale   = introPhase === 'shimmer' ? 1.03 : 1
  const introOpenScale     = introPhase === 'open' ? 1 : 0.9

  // --- Mode scroll (crossfade selon scrollProgress) ---
  // scrollProgress 0 → open visible, 1 → closed visible
  const scrollOpenOpacity   = 1 - scrollProgress
  const scrollClosedOpacity = scrollProgress
  // Légère mise à l'échelle : valise se "rétracte" légèrement en se fermant
  const scrollOpenScale     = 1 - scrollProgress * 0.06
  const scrollClosedScale   = 0.94 + scrollProgress * 0.06

  // Valeurs finales selon le mode
  const openOpacity   = mode === 'intro' ? introOpenOpacity   : scrollOpenOpacity
  const closedOpacity = mode === 'intro' ? introClosedOpacity : scrollClosedOpacity
  const openScale     = mode === 'intro' ? introOpenScale     : scrollOpenScale
  const closedScale   = mode === 'intro' ? introClosedScale   : scrollClosedScale

  // Effets visuels
  const showShimmer   = introPhase === 'shimmer' && mode === 'intro'
  const showRings     = (introPhase === 'shimmer' || introPhase === 'opening') && mode === 'intro'
  const showParticles = mode === 'intro'
    ? (introPhase === 'shimmer' || introPhase === 'opening' || introPhase === 'open')
    : scrollProgress < 0.35  // particules visibles quand valise est ouverte
  const showStars     = mode === 'intro'
    ? introPhase === 'open'
    : scrollProgress < 0.2
  const glowAlpha     = mode === 'intro'
    ? (introPhase === 'shimmer' ? 0.10 : introPhase === 'open' ? 0.07 : 0)
    : (1 - scrollProgress) * 0.07

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <style>{`
        @keyframes bg-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-14px); }
        }
        @keyframes bg-particle {
          0%   { transform: translateY(0) rotate(45deg); opacity: var(--op); }
          85%  { opacity: var(--op); }
          100% { transform: translateY(-80px) rotate(200deg) scale(0.1); opacity: 0; }
        }
        @keyframes bg-ring {
          0%   { transform: translate(-50%,-50%) scale(0.7); opacity: 0.4; }
          100% { transform: translate(-50%,-50%) scale(1.5); opacity: 0; }
        }
        @keyframes bg-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes bg-star {
          0%,100% { opacity: 0; transform: scale(0.3) rotate(0deg); }
          50%      { opacity: 0.6; transform: scale(1.1) rotate(180deg); }
        }
      `}</style>

      {/* 1 — Glow ambient */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: `radial-gradient(ellipse 65% 55% at 50% 55%,
          rgba(212,175,55,${glowAlpha}) 0%,
          rgba(212,175,55,${glowAlpha * 0.3}) 45%,
          transparent 70%)`,
        transition: 'background 1s ease',
      }} />

      {/* 2 — Pulse rings (intro seulement) */}
      {showRings && [0, 1].map(i => (
        <div key={i} aria-hidden="true" style={{
          position: 'absolute', left: '50%', top: '48%',
          width: '38%', aspectRatio: '1.6',
          border: '1px solid rgba(212,175,55,0.18)',
          borderRadius: '50%',
          animation: `bg-ring 2s ease-out ${i * 0.7}s infinite`,
          pointerEvents: 'none', zIndex: 2,
        }} />
      ))}

      {/* 3 — Particules */}
      {showParticles && particles.map(p => (
        <div key={p.id} aria-hidden="true" style={{
          position: 'absolute',
          left: `${p.x}%`, top: `${p.y}%`,
          width: `${p.size}px`, height: `${p.size}px`,
          borderRadius: p.size > 3.5 ? '2px' : '50%',
          background: `rgba(212,175,55,${p.opacity * (mode === 'scroll' ? 1 - scrollProgress : 1)})`,
          '--op': p.opacity,
          animation: `bg-particle ${p.duration}s ease-in ${p.delay}s infinite`,
          transform: 'rotate(45deg)',
          pointerEvents: 'none', zIndex: 2,
        } as React.CSSProperties} />
      ))}

      {/* 4 — Étoiles */}
      {showStars && [
        { x: 15, y: 20, d: 0,   s: 12 },
        { x: 82, y: 15, d: 0.5, s: 10 },
        { x: 90, y: 65, d: 1.0, s: 13 },
        { x: 10, y: 68, d: 0.7, s: 11 },
        { x: 48, y: 8,  d: 0.3, s: 10 },
      ].map((st, i) => (
        <svg key={i} aria-hidden="true" viewBox="0 0 24 24"
          fill={`rgba(212,175,55,${0.55 * (mode === 'scroll' ? 1 - scrollProgress * 5 : 1)})`}
          style={{
            position: 'absolute', left: `${st.x}%`, top: `${st.y}%`,
            width: `${st.s}px`, height: `${st.s}px`,
            animation: `bg-star 2.5s ease-in-out ${st.d}s infinite`,
            pointerEvents: 'none', zIndex: 2,
          }}
        >
          <path d="M12 2L13.5 9.5L21 12L13.5 14.5L12 22L10.5 14.5L3 12L10.5 9.5Z" />
        </svg>
      ))}

      {/* 5 — Valise FERMÉE */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 3, pointerEvents: 'none',
        opacity: closedOpacity,
        transform: `scale(${closedScale})`,
        // En mode scroll : pas de transition CSS (directement lié au scroll)
        transition: mode === 'intro'
          ? 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.34,1.56,0.64,1)'
          : 'none',
      }}>
        {showShimmer && (
          <div aria-hidden="true" style={{
            position: 'absolute', inset: '10%', borderRadius: '8px', zIndex: 4,
            background: 'linear-gradient(105deg,transparent 30%,rgba(212,175,55,0.12) 50%,transparent 70%)',
            backgroundSize: '200% 100%',
            animation: 'bg-shimmer 1.4s linear infinite',
            pointerEvents: 'none',
          }} />
        )}
        <Image
          src="/image_debut.png"
          alt=""
          width={1200}
          height={1200}
          priority
          style={{
            width: '60%', maxHeight: '70%', height: 'auto',
            objectFit: 'contain',
            animation: mode === 'intro' && introPhase === 'closed' ? 'bg-float 5s ease-in-out infinite' : 'none',
            filter: showShimmer
              ? 'drop-shadow(0 0 16px rgba(212,175,55,0.28)) drop-shadow(0 16px 32px rgba(0,0,0,0.7))'
              : 'drop-shadow(0 16px 32px rgba(0,0,0,0.7))',
            transition: 'filter 0.8s ease',
          }}
        />
      </div>

      {/* 6 — Valise OUVERTE */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 3, pointerEvents: 'none',
        opacity: openOpacity,
        transform: `scale(${openScale})`,
        transition: mode === 'intro'
          ? 'opacity 0.8s ease, transform 1s cubic-bezier(0.34,1.3,0.64,1)'
          : 'none',
      }}>
        <Image
          src="/image_fin.png"
          alt=""
          width={1200}
          height={1200}
          style={{
            width: '92%', maxHeight: '92%', height: 'auto',
            objectFit: 'contain',
            animation: (mode === 'intro' && introPhase === 'open') || (mode === 'scroll' && scrollProgress < 0.1)
              ? 'bg-float 6s ease-in-out infinite'
              : 'none',
            filter: 'drop-shadow(0 0 18px rgba(212,175,55,0.2)) drop-shadow(0 16px 32px rgba(0,0,0,0.7))',
          }}
        />
      </div>

      {/* 7 — Overlay sombre */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 55% 45% at 50% 50%,
            rgba(0,0,0,0.35) 0%,
            rgba(0,0,0,0.60) 55%,
            rgba(0,0,0,0.80) 100%
          ),
          linear-gradient(to bottom,
            rgba(0,0,0,0.80) 0%,
            rgba(0,0,0,0.30) 28%,
            rgba(0,0,0,0.30) 72%,
            rgba(0,0,0,0.82) 100%
          )
        `,
      }} />
    </div>
  )
}