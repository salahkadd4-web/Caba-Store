'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT, type Locale } from '@/lib/i18n'

/**
 * Sélecteur de langue FR / AR / EN, placé dans la zone d'actions en haut de chaque
 * surface (header client, barre du dashboard, haut des pages d'authentification).
 * Le déclencheur montre le drapeau de la langue active ; le menu liste chaque langue
 * écrite dans sa propre langue, pour qu'un utilisateur qui ne lit pas la langue
 * courante retrouve la sienne.
 * Mobile : drapeau seul (même gabarit que le bouton panier) ; dès md : drapeau + code + chevron.
 */
export default function LanguageSwitcher({
  size = 'md',
  className = '',
}: {
  /** 'sm' : 32px à toutes les tailles (barres compactes, ex. dashboard). */
  size?: 'sm' | 'md'
  className?: string
}) {
  const { locale, setLocale, switching, t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef    = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs   = useRef<(HTMLButtonElement | null)[]>([])
  const menuId     = useId()
  const sizeCls = size === 'sm' ? 'h-8 min-w-8' : 'h-8 md:h-10 min-w-8 md:min-w-10'

  // Clic extérieur → fermer (même mécanique que le menu utilisateur de Nav)
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // À l'ouverture, le focus va sur la langue active
  useEffect(() => {
    if (open) itemRefs.current[LOCALES.indexOf(locale)]?.focus()
  }, [open, locale])

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function choose(next: Locale) {
    close()
    if (next !== locale) setLocale(next)
  }

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const n = LOCALES.length
    const i = itemRefs.current.findIndex(el => el === document.activeElement)
    const target =
      e.key === 'ArrowDown' ? (i + 1) % n :
      e.key === 'ArrowUp'   ? (i - 1 + n) % n :
      e.key === 'Home'      ? 0 :
      e.key === 'End'       ? n - 1 :
      null
    if (target !== null) {
      e.preventDefault()
      itemRefs.current[target]?.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        disabled={switching}
        title={t.layout.lang.choose}
        aria-label={`${t.layout.lang.choose} (${LOCALE_LABELS[locale]})`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={`flex items-center justify-center gap-1.5 ${sizeCls} px-2 rounded-full text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-orange-700 dark:hover:text-orange-400 transition-colors active:scale-95 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 ${className}`}
      >
        <Flag locale={locale} />
        <span className="hidden md:inline text-xs font-semibold" lang={locale}>{LOCALE_SHORT[locale]}</span>
        <ChevronDown
          aria-hidden
          className={`hidden md:block w-3 h-3 text-stone-500 dark:text-stone-400 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t.layout.lang.choose}
          onKeyDown={onMenuKeyDown}
          className="absolute end-0 top-full mt-2 w-44 py-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-xl overflow-hidden z-50"
        >
          {LOCALES.map((l, i) => {
            const active = l === locale
            return (
              <button
                key={l}
                ref={el => { itemRefs.current[i] = el }}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                tabIndex={-1}
                onClick={() => choose(l)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-start transition-colors outline-none hover:bg-orange-50 dark:hover:bg-stone-800 focus-visible:bg-orange-50 dark:focus-visible:bg-stone-800 ${
                  active
                    ? 'font-medium text-orange-700 dark:text-orange-400'
                    : 'text-stone-700 dark:text-stone-300 hover:text-orange-700 dark:hover:text-orange-400'
                }`}
              >
                <Flag locale={l} />
                <span className="flex-1" lang={l}>{LOCALE_LABELS[l]}</span>
                {active && <Check aria-hidden className="w-4 h-4 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Drapeaux ─────────────────────────────────────────────────────────────────
// SVG inline : les émojis drapeaux ne s'affichent pas sous Windows.
// Arabe → Algérie, français → France, anglais → Royaume-Uni. Format 3:2.

function Flag({ locale }: { locale: Locale }) {
  return (
    <span
      aria-hidden
      className="block w-5 h-[14px] shrink-0 rounded-[3px] overflow-hidden ring-1 ring-black/10 dark:ring-white/20"
    >
      {locale === 'ar' ? <FlagDZ /> : locale === 'en' ? <FlagGB /> : <FlagFR />}
    </span>
  )
}

function FlagDZ() {
  return (
    <svg viewBox="0 0 900 600" className="block w-full h-full">
      <rect width="450" height="600" fill="#006233" />
      <rect x="450" width="450" height="600" fill="#fff" />
      {/* Croissant : cercle r=150 centré, évidé par un cercle r=120 décalé à droite */}
      <path d="M576.75 219.78A150 150 0 1 0 576.75 380.22A120 120 0 1 1 576.75 219.78Z" fill="#D21034" />
      <path
        d="M457 300L508.8 283.2L508.8 228.7L540.9 272.8L592.7 255.9L560.65 300L592.7 344.1L540.9 327.2L508.8 371.3L508.8 316.8Z"
        fill="#D21034"
      />
    </svg>
  )
}

function FlagFR() {
  return (
    <svg viewBox="0 0 3 2" className="block w-full h-full">
      <rect width="1" height="2" fill="#002654" />
      <rect x="1" width="1" height="2" fill="#fff" />
      <rect x="2" width="1" height="2" fill="#CE1126" />
    </svg>
  )
}

function FlagGB() {
  // Les id de clipPath doivent être uniques : le drapeau apparaît plusieurs fois par page.
  const clip = `gb${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" className="block w-full h-full">
      <clipPath id={clip}>
        <path d="M30 15h30v15zv15H0zH0V0zV0h30z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
      <path d="M0 0l60 30m0-30L0 30" clipPath={`url(#${clip})`} stroke="#C8102E" strokeWidth="4" />
      <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  )
}
