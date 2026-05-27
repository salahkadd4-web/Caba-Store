'use client'

import { useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

type Props = {
  value:    number
  stockMax: number
  onChange: (v: number) => void
  onZero?:  () => void
  size?:    'sm' | 'md'
  disabled?: boolean
}

/**
 * Saisie de quantité avec stepper +/−.
 * raw === null  →  pas en édition, affiche la prop value
 * raw !== null  →  l'utilisateur tape, affiche ce qu'il tape
 * Pas de useEffect : sync via prev.current comparé au render.
 */
export default function QteInput({
  value, stockMax, onChange, onZero, size = 'md', disabled = false,
}: Props) {
  const [raw, setRaw] = useState<string | null>(null)
  const inputRef      = useRef<HTMLInputElement>(null)

  // Sync externe : si value change et qu'on n'est pas en train de taper, reset raw
  const prevValue = useRef(value)
  if (prevValue.current !== value && raw === null) {
    prevValue.current = value
  }
  if (prevValue.current !== value && document.activeElement !== inputRef.current) {
    prevValue.current = value
    // raw est non-null seulement si on tape, mais focus est perdu → reset
  }

  const displayValue = raw !== null ? raw : String(value)

  const commit = (str: string) => {
    const n = parseInt(str, 10)
    if (isNaN(n) || n <= 0) {
      if (onZero) { onZero(); setRaw(null); return }
      onChange(1)
    } else {
      onChange(Math.min(n, stockMax))
    }
    setRaw(null)
  }

  const decrement = () => {
    const next = value - 1
    if (next <= 0) { if (onZero) { onZero(); return } onChange(1); return }
    onChange(next)
  }

  const increment = () => {
    if (value >= stockMax) return
    onChange(value + 1)
  }

  const isSm = size === 'sm'

  const btnCls = isSm
    ? 'w-6 h-6 rounded-md flex items-center justify-center text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/40 transition disabled:opacity-30 shrink-0'
    : 'w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition disabled:opacity-30 shrink-0'

  const inputCls = isSm
    ? 'w-10 text-center font-bold text-sm tabular-nums bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 outline-none border border-stone-200 dark:border-stone-700 rounded-lg py-0.5 focus:ring-2 focus:ring-orange-700/20 focus:border-orange-700 dark:focus:border-orange-400 disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none transition'
    : 'w-14 text-center font-bold text-sm tabular-nums bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 outline-none border border-stone-200 dark:border-stone-700 rounded-lg py-1.5 focus:ring-2 focus:ring-orange-700/20 focus:border-orange-700 dark:focus:border-orange-400 disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none transition'

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        tabIndex={-1}
        onClick={decrement}
        disabled={disabled || value <= 1}
        className={btnCls}
      >
        <Minus className={isSm ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
      </button>

      <input
        ref={inputRef}
        type="number"
        min={1}
        max={stockMax}
        value={displayValue}
        disabled={disabled}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={(e)    => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { commit(raw ?? String(value)); inputRef.current?.blur() }
        }}
        onFocus={(e)   => { setRaw(String(value)); e.target.select() }}
        className={inputCls}
      />

      <button
        type="button"
        tabIndex={-1}
        onClick={increment}
        disabled={disabled || value >= stockMax}
        className={btnCls}
      >
        <Plus className={isSm ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
      </button>
    </div>
  )
}
