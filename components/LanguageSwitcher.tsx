'use client'

import { Languages } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'

/**
 * Bascule FR ⇄ AR, placée dans la zone d'actions en haut de chaque surface
 * (header client, barre du dashboard, haut des pages d'authentification).
 * Le libellé est toujours écrit dans la langue cible, pour qu'un utilisateur
 * qui ne lit pas la langue courante le reconnaisse.
 * Mobile : libellé court seul (même gabarit que le bouton panier) ; dès md : icône + libellé.
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
  const next = locale === 'ar' ? 'fr' : 'ar'
  const sizeCls = size === 'sm' ? 'h-8 min-w-8' : 'h-8 md:h-10 min-w-8 md:min-w-10'

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      disabled={switching}
      title={t.layout.lang.switchTo}
      aria-label={t.layout.lang.switchAria}
      lang={next}
      className={`shrink-0 flex items-center justify-center gap-1 ${sizeCls} px-2 rounded-full text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-orange-700 dark:hover:text-orange-400 transition-colors active:scale-95 disabled:opacity-60 ${className}`}
    >
      <Languages className="hidden md:block w-4 h-4" />
      <span className="text-xs font-semibold">{t.layout.lang.switchToShort}</span>
    </button>
  )
}
