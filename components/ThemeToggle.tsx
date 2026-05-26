'use client'

import { useTheme } from '@/components/ThemeProvider'
import { useState, useRef, useEffect, useCallback } from 'react'

/* ── Icons ── */
const icons = {
  light: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  ),
  dark: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),
  system: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
}

const options: { key: 'light' | 'dark' | 'system'; label: string }[] = [
  { key: 'light', label: 'Clair' },
  { key: 'dark', label: 'Sombre' },
  { key: 'system', label: 'Système' },
]

const BTN = 48
const EDGE = 12
const NAV_BOTTOM = 80
const DRAG_THRESHOLD = 6
const SNAP_MS = 300

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [snapping, setSnapping] = useState(false)

  const clamp = useCallback((x: number, y: number) => {
    return {
      x: Math.max(EDGE, Math.min(window.innerWidth - BTN - EDGE, x)),
      y: Math.max(EDGE, Math.min(window.innerHeight - BTN - EDGE, y)),
    }
  }, [])

  /* ✅ FIX: init state safe (no effect setState) */
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === 'undefined') return null

    const saved = localStorage.getItem('theme-btn-pos')

    const safeClamp = (x: number, y: number) => ({
      x: Math.max(EDGE, Math.min(window.innerWidth - BTN - EDGE, x)),
      y: Math.max(EDGE, Math.min(window.innerHeight - BTN - EDGE, y)),
    })

    if (saved) {
      try {
        const p = JSON.parse(saved)
        return safeClamp(p.x, p.y)
      } catch {}
    }

    return {
      x: EDGE,
      y: window.innerHeight - BTN - NAV_BOTTOM,
    }
  })

  const desktopRef = useRef<HTMLDivElement>(null)
  const mobileRef = useRef<HTMLDivElement>(null)

  const drag = useRef<{
    startClientX: number
    startClientY: number
    startPosX: number
    startPosY: number
    moved: boolean
  } | null>(null)

  const snapToEdge = useCallback((x: number, y: number) => {
    const snappedX =
      x + BTN / 2 < window.innerWidth / 2
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

  /* resize safety */
  useEffect(() => {
    const onResize = () => {
      setPos(prev => (prev ? clamp(prev.x, prev.y) : prev))
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [clamp])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pos) return

    e.currentTarget.setPointerCapture(e.pointerId)

    drag.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
      moved: false,
    }

    setSnapping(false)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
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
      setPos(
        clamp(
          drag.current.startPosX + dx,
          drag.current.startPosY + dy
        )
      )
    }
  }

  const onPointerUp = () => {
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
  }

  const onPointerCancel = () => {
    drag.current = null
    setDragging(false)
  }

  useEffect(() => {
    if (!open) return

    const close = (e: PointerEvent) => {
      const target = e.target as Node

      const inDesktop = desktopRef.current?.contains(target)
      const inMobile = mobileRef.current?.contains(target)

      if (!inDesktop && !inMobile) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const menuAbove = pos ? pos.y > window.innerHeight * 0.55 : true
  const menuRight = pos ? pos.x > window.innerWidth * 0.5 : false

  return (
    <>
      {/* DESKTOP */}
      <div
        ref={desktopRef}
        className="hidden md:flex fixed bottom-6 right-6 z-50 flex-col items-center gap-2"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className={`flex flex-col gap-2 transition-all duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          {options.map(opt => (
            <button
              key={opt.key}
              onClick={() => setTheme(opt.key)}
              className="w-11 h-11 rounded-full shadow border flex items-center justify-center"
            >
              {icons[opt.key]}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE */}
      {pos && (
        <div
          ref={mobileRef}
          className="md:hidden fixed z-50"
          style={{
            left: pos.x,
            top: pos.y,
            width: BTN,
            height: BTN,
            touchAction: 'none',
            userSelect: 'none',
            cursor: dragging ? 'grabbing' : 'grab',
            transition: snapping ? `left ${SNAP_MS}ms, top ${SNAP_MS}ms` : 'none',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          {open && (
            <div className={`absolute flex flex-col gap-2 ${
              menuAbove ? 'bottom-14' : 'top-14'
            } ${menuRight ? 'right-0' : 'left-0'}`}>
              {options.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setTheme(opt.key)
                    setOpen(false)
                  }}
                  className="w-11 h-11 rounded-full shadow border flex items-center justify-center"
                >
                  {icons[opt.key]}
                </button>
              ))}
            </div>
          )}

          <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow">
            {icons[theme as 'light' | 'dark' | 'system']}
          </div>
        </div>
      )}
    </>
  )
}