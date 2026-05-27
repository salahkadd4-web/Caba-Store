'use client'

import { useTheme } from '@/components/ThemeProvider'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

const options: { key: 'light' | 'dark' | 'system'; label: string; icon: React.ElementType }[] = [
  { key: 'light',  label: 'Clair',   icon: Sun },
  { key: 'dark',   label: 'Sombre',  icon: Moon },
  { key: 'system', label: 'Système', icon: Monitor },
]

const BTN = 44
const EDGE = 16
const NAV_BOTTOM = 88
const DRAG_THRESHOLD = 6
const SNAP_MS = 300

function getInitialPos(): { x: number; y: number } {
  const defaultPos = { x: EDGE, y: window.innerHeight - BTN - NAV_BOTTOM }
  try {
    const saved = localStorage.getItem('theme-btn-pos')
    if (!saved) return defaultPos
    const p = JSON.parse(saved)
    return {
      x: Math.max(EDGE, Math.min(window.innerWidth - BTN - EDGE, p.x)),
      y: Math.max(EDGE, Math.min(window.innerHeight - BTN - EDGE, p.y)),
    }
  } catch {
    return defaultPos
  }
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const [open,     setOpen]     = useState(false)
  const [dragging, setDragging] = useState(false)
  const [snapping, setSnapping] = useState(false)

  const [pos, setPos] = useState<{ x: number; y: number } | null>(
    () => typeof window !== 'undefined' ? getInitialPos() : null
  )

  const desktopRef = useRef<HTMLDivElement>(null)
  const mobileRef  = useRef<HTMLDivElement>(null)
  const drag = useRef<{
    startClientX: number; startClientY: number
    startPosX: number;   startPosY: number
    moved: boolean
  } | null>(null)

  const clamp = useCallback((x: number, y: number) => ({
    x: Math.max(EDGE, Math.min(window.innerWidth  - BTN - EDGE, x)),
    y: Math.max(EDGE, Math.min(window.innerHeight - BTN - EDGE, y)),
  }), [])

  const snapToEdge = useCallback((x: number, y: number) => {
    const snappedX = x + BTN / 2 < window.innerWidth / 2
      ? EDGE : window.innerWidth - BTN - EDGE
    const snappedY = Math.max(EDGE, Math.min(window.innerHeight - BTN - NAV_BOTTOM, y))
    setSnapping(true)
    setPos({ x: snappedX, y: snappedY })
    localStorage.setItem('theme-btn-pos', JSON.stringify({ x: snappedX, y: snappedY }))
    setTimeout(() => setSnapping(false), SNAP_MS)
  }, [])

  useEffect(() => {
    const onResize = () => setPos(prev => prev ? clamp(prev.x, prev.y) : prev)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [clamp])

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      const t = e.target as Node
      if (!desktopRef.current?.contains(t) && !mobileRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pos) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startClientX: e.clientX, startClientY: e.clientY, startPosX: pos.x, startPosY: pos.y, moved: false }
    setSnapping(false)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.startClientX
    const dy = e.clientY - drag.current.startClientY
    if (!drag.current.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      drag.current.moved = true; setDragging(true); setOpen(false)
    }
    if (drag.current.moved) setPos(clamp(drag.current.startPosX + dx, drag.current.startPosY + dy))
  }

  const onPointerUp = () => {
    if (!drag.current) return
    if (!drag.current.moved) setOpen(o => !o)
    else setPos(prev => { if (prev) snapToEdge(prev.x, prev.y); return prev })
    setDragging(false)
    drag.current = null
  }

  const onPointerCancel = () => { drag.current = null; setDragging(false) }

  const CurrentIcon = options.find(o => o.key === theme)?.icon ?? Sun
  const menuAbove   = pos ? pos.y > window.innerHeight * 0.55 : true
  const menuRight   = pos ? pos.x > window.innerWidth  * 0.5  : false

  if (!pos) return null

  return (
    <>
      {/* ── DESKTOP — même coin que le Header (bottom-right) ── */}
      <div
        ref={desktopRef}
        className="hidden md:flex fixed bottom-6 right-6 z-50 flex-col items-end gap-2"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {/* Options flottantes */}
        <div className={`flex flex-col items-end gap-1.5 transition-all duration-200 origin-bottom
          ${open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}
        >
          {options.map(opt => {
            const Icon    = opt.icon
            const active  = theme === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => { setTheme(opt.key); setOpen(false) }}
                className={`flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-full text-xs font-medium
                  border shadow-sm backdrop-blur-sm transition-all duration-150 active:scale-95
                  ${active
                    ? 'bg-orange-700 text-white border-orange-700 shadow-orange-200 dark:shadow-orange-900'
                    : 'bg-[#FAF7F2]/95 dark:bg-stone-900/95 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-700 dark:hover:text-orange-400'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Bouton principal */}
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-md
            bg-[#FAF7F2]/95 dark:bg-stone-900/95 backdrop-blur-sm
            border border-stone-200 dark:border-stone-700
            text-stone-700 dark:text-stone-200
            hover:border-orange-300 dark:hover:border-orange-700
            hover:text-orange-700 dark:hover:text-orange-400
            transition-all duration-150 active:scale-95"
        >
          <CurrentIcon className="w-4 h-4" />
        </button>
      </div>

      {/* ── MOBILE — draggable, même style ── */}
      <div
        ref={mobileRef}
        className="md:hidden fixed z-50"
        style={{
          left: pos.x, top: pos.y,
          width: BTN,  height: BTN,
          touchAction: 'none', userSelect: 'none',
          cursor: dragging ? 'grabbing' : 'grab',
          transition: snapping ? `left ${SNAP_MS}ms cubic-bezier(.4,0,.2,1), top ${SNAP_MS}ms cubic-bezier(.4,0,.2,1)` : 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {/* Menu options */}
        {open && (
          <div className={`absolute flex flex-col gap-1.5
            ${menuAbove ? 'bottom-14' : 'top-14'}
            ${menuRight ? 'right-0'   : 'left-0'}`}
          >
            {options.map(opt => {
              const Icon   = opt.icon
              const active = theme === opt.key
              return (
                <button
                  key={opt.key}
                  onClick={() => { setTheme(opt.key); setOpen(false) }}
                  className={`flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-full text-xs font-medium
                    border shadow-md backdrop-blur-sm whitespace-nowrap transition-all active:scale-95
                    ${active
                      ? 'bg-orange-700 text-white border-orange-700'
                      : 'bg-[#FAF7F2]/95 dark:bg-stone-900/95 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Bouton principal mobile */}
        <div className={`w-full h-full rounded-full flex items-center justify-center shadow-md
          border backdrop-blur-sm transition-all
          ${open
            ? 'bg-orange-700 text-white border-orange-700'
            : 'bg-[#FAF7F2]/95 dark:bg-stone-900/95 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700'
          }`}
        >
          <CurrentIcon className="w-4 h-4" />
        </div>
      </div>
    </>
  )
}