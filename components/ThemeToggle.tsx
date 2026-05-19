'use client'

import { useTheme } from '@/components/ThemeProvider'
import { useState, useRef, useEffect, useCallback } from 'react'

/* ── Icônes ── */
const icons = {
  light: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  ),
  dark: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    </svg>
  ),
  system: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  ),
}

const options: { key: 'light' | 'dark' | 'system'; label: string }[] = [
  { key: 'light',  label: 'Clair'   },
  { key: 'dark',   label: 'Sombre'  },
  { key: 'system', label: 'Système' },
]

const BTN            = 48
const EDGE           = 12
const NAV_BOTTOM     = 80
const DRAG_THRESHOLD = 6
const SNAP_MS        = 300

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const [open,     setOpen]     = useState(false)
  const [dragging, setDragging] = useState(false)
  const [snapping, setSnapping] = useState(false)

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  /* ✅ Nouveau : un ref desktop + un ref mobile */
  const desktopRef = useRef<HTMLDivElement>(null)
  const mobileRef  = useRef<HTMLDivElement>(null)

  const drag = useRef<{
    startClientX: number
    startClientY: number
    startPosX:    number
    startPosY:    number
    moved:        boolean
  } | null>(null)

  const clamp = useCallback((x: number, y: number) => ({
    x: Math.max(EDGE, Math.min(window.innerWidth  - BTN - EDGE, x)),
    y: Math.max(EDGE, Math.min(window.innerHeight - BTN - EDGE, y)),
  }), [])

  const snapToEdge = useCallback((x: number, y: number) => {
    const snappedX = x + BTN / 2 < window.innerWidth / 2
      ? EDGE
      : window.innerWidth - BTN - EDGE

    const snappedY = Math.max(
      EDGE,
      Math.min(window.innerHeight - BTN - NAV_BOTTOM, y)
    )

    setSnapping(true)
    setPos({ x: snappedX, y: snappedY })

    localStorage.setItem(
      'theme-btn-pos',
      JSON.stringify({ x: snappedX, y: snappedY })
    )

    setTimeout(() => setSnapping(false), SNAP_MS)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('theme-btn-pos')

    if (saved) {
      try {
        const p = JSON.parse(saved) as { x: number; y: number }
        setPos(clamp(p.x, p.y))
        return
      } catch {}
    }

    setPos({
      x: EDGE,
      y: window.innerHeight - BTN - NAV_BOTTOM,
    })
  }, [clamp])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!pos) return

    e.currentTarget.setPointerCapture(e.pointerId)

    drag.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPosX:    pos.x,
      startPosY:    pos.y,
      moved:        false,
    }

    setSnapping(false)
  }, [pos])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return

    const dx = e.clientX - drag.current.startClientX
    const dy = e.clientY - drag.current.startClientY

    if (
      !drag.current.moved &&
      (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)
    ) {
      drag.current.moved = true
      setDragging(true)
      setOpen(false)
    }

    if (drag.current.moved) {
      setPos(clamp(
        drag.current.startPosX + dx,
        drag.current.startPosY + dy,
      ))
    }
  }, [clamp])

  const onPointerUp = useCallback(() => {
    if (!drag.current) return

    if (!drag.current.moved) {
      setOpen(o => !o)
    } else {
      setPos(prev => {
        if (prev) snapToEdge(prev.x, prev.y)
        return prev
      })
    }

    setDragging(false)
    drag.current = null
  }, [snapToEdge])

  /* ✅ Nouveau close handler qui vérifie desktop + mobile */
  useEffect(() => {
    if (!open) return

    const close = (e: PointerEvent) => {
      const target = e.target as Node

      const inDesktop = desktopRef.current?.contains(target)
      const inMobile  = mobileRef.current?.contains(target)

      if (!inDesktop && !inMobile) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', close)

    return () => {
      document.removeEventListener('pointerdown', close)
    }
  }, [open])

  const menuAbove = pos ? pos.y > window.innerHeight * 0.55 : true
  const menuRight = pos ? pos.x > window.innerWidth  * 0.5  : false

  return (
    <>
      {/* ─────────────────────────────────────
          DESKTOP
      ───────────────────────────────────────── */}
      <div
        ref={desktopRef}
        className="hidden md:flex fixed bottom-6 right-6 z-50 flex-col items-center gap-2"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className={`flex flex-col gap-2 transition-all duration-300 ${
          open
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}>
          {options.map(opt => (
            <button
              key={opt.key}
              onClick={() => setTheme(opt.key)}
              title={opt.label}
              className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 border
                ${theme === opt.key
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white scale-110'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:scale-105'
                }`}
            >
              {icons[opt.key]}
            </button>
          ))}
        </div>

        <button
          className="w-12 h-12 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl flex items-center justify-center border-2 border-gray-700 dark:border-gray-200 hover:scale-110 transition-all duration-300"
          title="Thème"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
          </svg>
        </button>
      </div>

      {/* ─────────────────────────────────────
          MOBILE
      ───────────────────────────────────────── */}
      {pos && (
        <div
          ref={mobileRef}
          className="md:hidden fixed z-50"
          style={{
            left:        pos.x,
            top:         pos.y,
            width:       BTN,
            height:      BTN,
            touchAction: 'none',
            userSelect:  'none',
            cursor:      dragging ? 'grabbing' : 'grab',
            transition:  snapping
              ? `left ${SNAP_MS}ms cubic-bezier(0.34,1.56,0.64,1),
                 top  ${SNAP_MS}ms cubic-bezier(0.34,1.56,0.64,1)`
              : 'none',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null
            setDragging(false)
          }}
        >

          {/* ── Popup options ── */}
          {open && (
            <div className={`absolute flex flex-col gap-2
              ${menuAbove ? 'bottom-14' : 'top-14'}
              ${menuRight ? 'right-0' : 'left-0'}
            `}>
              {options.map(opt => (
                <button
                  key={opt.key}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => {
                    setTheme(opt.key)
                    setOpen(false)
                  }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center shadow-xl border-2 transition-all active:scale-95
                    ${theme === opt.key
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white scale-110'
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                    }`}
                  title={opt.label}
                >
                  {icons[opt.key]}
                </button>
              ))}
            </div>
          )}

          {/* ── Bouton principal ── */}
          <div
            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center gap-0.5
              bg-gray-900 dark:bg-white text-white dark:text-gray-900
              shadow-lg border-2 border-gray-700 dark:border-gray-200
              transition-opacity duration-300 select-none
              ${dragging
                ? 'opacity-80 border-blue-500'
                : open ? 'opacity-95' : 'opacity-40'
              }
            `}
          >
            {icons[theme as 'light' | 'dark' | 'system'] ?? icons.system}

            <div className="flex gap-0.5 mt-0.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-current opacity-50"
                />
              ))}
            </div>
          </div>

        </div>
      )}
    </>
  )
}