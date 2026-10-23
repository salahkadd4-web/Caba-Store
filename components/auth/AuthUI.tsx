'use client'

/**
 * components/auth/AuthUI.tsx
 * --------------------------
 * Briques du style « épuré » des pages de compte (connexion, inscription,
 * finalisations, mot de passe oublié).
 *
 *  - Ordinateur (md+) : le header du site reste visible ; le formulaire est une
 *    carte centrée sur le fond pierre, les garanties en dessous.
 *  - Téléphone : écran d'application natif — barre du haut (retour, étape,
 *    langue), grand titre, grands champs, actions fixées en bas de l'écran.
 */

import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import Link from 'next/link'
import { Check, ChevronLeft, Eye, EyeOff, RotateCcw, Truck, Wallet, X, type LucideIcon } from 'lucide-react'
import CabaLogo from '@/components/CabaLogo'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useI18n } from '@/components/I18nProvider'

// ─── Classes partagées ────────────────────────────────────────────────────────

export const authPrimaryBtn =
  'w-full h-[52px] md:h-12 rounded-xl bg-orange-700 hover:bg-orange-800 active:bg-orange-900 text-white ' +
  'font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50'

export const authSecondaryBtn =
  'w-full h-[52px] md:h-12 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 ' +
  'hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-100 font-medium text-[15px] ' +
  'flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50'

export const authLink = 'font-semibold text-orange-700 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300'

// ─── Écran ────────────────────────────────────────────────────────────────────

export function AuthScreen({
  title,
  subtitle,
  backHref = '/',
  backIcon = 'back',
  onBack,
  step,
  children,
  below,
  showTrust = false,
}: {
  title: string
  subtitle?: ReactNode
  /** Cible du bouton retour de la barre mobile */
  backHref?: string
  backIcon?: 'back' | 'close'
  /** Remplace le lien retour (ex. revenir à l'étape précédente) */
  onBack?: () => void
  /** Parcours en plusieurs étapes : barre de progression + « Étape 1 sur 2 » */
  step?: { current: number; total: number }
  children: ReactNode
  /** Contenu sous la carte, sur ordinateur (liens secondaires) */
  below?: ReactNode
  showTrust?: boolean
}) {
  const { t } = useI18n()
  const BackIcon = backIcon === 'close' ? X : ChevronLeft
  const backCls = 'w-11 h-11 -ms-1 rounded-xl flex items-center justify-center text-stone-800 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 active:bg-stone-200 transition-colors'
  const stepLabel = step ? t.auth.stepOf(step.current, step.total) : ''

  return (
    <div className="min-h-[100dvh] md:min-h-[calc(100dvh-4rem)] bg-white dark:bg-stone-950 md:bg-[#f3f0ec] md:dark:bg-stone-950 md:flex md:flex-col md:items-center md:justify-center md:px-4 md:py-14">

      {/* ── Barre d'application (téléphone) ── */}
      <div className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-stone-950/95 backdrop-blur-sm pt-[env(safe-area-inset-top)]">
        <div className="h-14 px-3 flex items-center gap-2">
          {onBack ? (
            <button type="button" onClick={onBack} aria-label={t.common.back} className={backCls}>
              <BackIcon className="w-6 h-6 rtl-flip" />
            </button>
          ) : (
            <Link href={backHref} aria-label={t.common.back} className={backCls}>
              <BackIcon className="w-6 h-6 rtl-flip" />
            </Link>
          )}
          <span className="flex-1 text-center text-[15px] font-semibold text-stone-800 dark:text-stone-100">{stepLabel}</span>
          <LanguageSwitcher />
        </div>
        {step && <StepBar step={step} className="px-5 pb-1" />}
      </div>

      {/* ── Carte (ordinateur) / contenu (téléphone) ── */}
      <div className="px-5 pt-3 pb-6 md:w-full md:max-w-[440px] md:bg-white md:dark:bg-stone-900 md:rounded-2xl md:border md:border-stone-200 md:dark:border-stone-800 md:shadow-[0_1px_2px_rgba(28,25,23,0.04),0_16px_40px_-16px_rgba(28,25,23,0.16)] md:p-9">
        <CabaLogo className="md:hidden w-9 h-11 text-orange-700 dark:text-orange-500 mb-4" />
        {step && (
          <div className="hidden md:block mb-6">
            <p className="text-sm font-medium text-stone-500 dark:text-stone-400 mb-2">{stepLabel}</p>
            <StepBar step={step} />
          </div>
        )}
        <h1 className="text-[30px] md:text-[26px] leading-tight font-semibold tracking-tight text-stone-900 dark:text-stone-50">{title}</h1>
        {subtitle && <p className="mt-1.5 text-stone-500 dark:text-stone-400">{subtitle}</p>}
        <div className="mt-6 space-y-4">{children}</div>
      </div>

      {/* ── Sous la carte (ordinateur) ── */}
      {(below || showTrust) && (
        <div className="hidden md:flex flex-col items-center gap-5 mt-6 text-sm text-stone-500 dark:text-stone-400">
          {below}
          {showTrust && <TrustRow />}
        </div>
      )}
    </div>
  )
}

function StepBar({ step, className = '' }: { step: { current: number; total: number }; className?: string }) {
  return (
    <div className={`flex gap-1.5 ${className}`} aria-hidden="true">
      {Array.from({ length: step.total }).map((_, i) => (
        <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < step.current ? 'bg-orange-700 dark:bg-orange-500' : 'bg-stone-200 dark:bg-stone-800'}`} />
      ))}
    </div>
  )
}

function TrustRow() {
  const { t } = useI18n()
  const items: { icon: LucideIcon; text: string }[] = [Truck, Wallet, RotateCcw].map((icon, i) => ({ icon, text: t.home.trust[i].title }))
  return (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
      {items.map(({ icon: Icon, text }) => (
        <span key={text} className="inline-flex items-center gap-1.5">
          <Icon className="w-4 h-4" /> {text}
        </span>
      ))}
    </div>
  )
}

// ─── Actions : bas de carte (ordinateur), fixées en bas d'écran (téléphone) ──

export function AuthActions({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hauteur, setHauteur] = useState(0)

  // Réserve la hauteur de la barre fixe pour que rien ne passe dessous (téléphone)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setHauteur(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <>
      <div aria-hidden="true" className="md:hidden" style={{ height: hauteur }} />
      <div
        ref={ref}
        className="fixed md:static inset-x-0 bottom-0 z-30 space-y-3 bg-white dark:bg-stone-950 md:bg-transparent md:dark:bg-transparent border-t border-stone-100 dark:border-stone-800 md:border-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-0 md:pt-2"
      >
        {children}
      </div>
    </>
  )
}

// ─── Champs ───────────────────────────────────────────────────────────────────

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label?: ReactNode
  /** Lien ou info à droite du libellé (ex. « Mot de passe oublié ? ») */
  labelAside?: ReactNode
  icon?: LucideIcon
  /** Élément à l'intérieur du champ, côté fin (bouton, icône d'état) */
  end?: ReactNode
  /** Texte d'aide ou de statut sous le champ */
  hint?: ReactNode
  tone?: 'default' | 'ok' | 'error'
}

export function AuthField({ id, label, labelAside, icon: Icon, end, hint, tone = 'default', className = '', ...props }: FieldProps) {
  const border =
    tone === 'error' ? 'border-red-400 dark:border-red-500' :
    tone === 'ok'    ? 'border-emerald-500 dark:border-emerald-400' :
    'border-stone-300 dark:border-stone-700'
  return (
    <div className="space-y-1.5">
      {(label || labelAside) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && <label htmlFor={id} className="text-sm font-medium text-stone-700 dark:text-stone-300">{label}</label>}
          {labelAside}
        </div>
      )}
      <div className="relative">
        {Icon && <Icon aria-hidden="true" className="absolute start-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-stone-400 dark:text-stone-500 pointer-events-none" />}
        <input
          id={id}
          className={`w-full h-[52px] md:h-12 ${Icon ? 'ps-11' : 'ps-3.5'} ${end ? 'pe-14' : 'pe-3.5'} rounded-xl border ${border} bg-white dark:bg-stone-900 text-base md:text-[15px] text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-orange-700 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-700/10 transition-colors ${className}`}
          {...props}
        />
        {end && <div className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center">{end}</div>}
      </div>
      {hint}
    </div>
  )
}

/** Champ mot de passe avec bouton afficher / masquer. */
export function PasswordField(props: Omit<FieldProps, 'type' | 'end'>) {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)
  return (
    <AuthField
      {...props}
      type={visible ? 'text' : 'password'}
      end={
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? t.auth.signup.hide : t.auth.signup.show}
          aria-pressed={visible}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          {visible ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
        </button>
      }
    />
  )
}

// ─── Sélecteur à deux options (Email / Téléphone…) ────────────────────────────

export function Segmented<T extends string>({
  options, value, onChange, label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-flow-col auto-cols-fr gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-10 rounded-lg text-sm transition-colors ${value === o.value
            ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 font-semibold shadow-sm'
            : 'text-stone-500 dark:text-stone-400 font-medium hover:text-stone-800 dark:hover:text-stone-200'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export function AuthAlert({ tone, children }: { tone: 'error' | 'success' | 'info' | 'warning'; children: ReactNode }) {
  const cls = {
    error:   'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300',
    success: 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300',
    info:    'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300',
    warning: 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300',
  }[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm space-y-1 ${cls}`}>
      {children}
    </div>
  )
}

export function AuthDivider() {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-3 text-sm text-stone-400 dark:text-stone-500">
      <span className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
      {t.auth.or}
      <span className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
    </div>
  )
}

export function Spinner({ light = false }: { light?: boolean }) {
  return <span aria-hidden="true" className={`w-4 h-4 rounded-full border-2 animate-spin ${light ? 'border-white/30 border-t-white' : 'border-stone-200 border-t-stone-500'}`} />
}

// ─── Code de confirmation en 6 cases ──────────────────────────────────────────

export function OtpInput({
  value, onChange, length = 6, label, autoFocus = true, disabled = false,
}: {
  value: string
  onChange: (v: string) => void
  length?: number
  label: string
  autoFocus?: boolean
  disabled?: boolean
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const chiffres = value.replace(/\D/g, '').slice(0, length).split('')

  const ecrire = (debut: number, saisie: string) => {
    const nouveaux = saisie.replace(/\D/g, '')
    if (!nouveaux) return
    const tab = [...chiffres]
    for (let i = 0; i < nouveaux.length && debut + i < length; i++) tab[debut + i] = nouveaux[i]
    const v = tab.join('').slice(0, length)
    onChange(v)
    refs.current[Math.min(debut + nouveaux.length, length - 1)]?.focus()
  }

  return (
    <div role="group" aria-label={label} dir="ltr" className="flex justify-between gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          value={chiffres[i] ?? ''}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          aria-label={`${label} ${i + 1}`}
          maxLength={length}
          onChange={e => ecrire(i, e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Backspace') {
              e.preventDefault()
              const tab = [...chiffres]
              if (tab[i]) { tab[i] = ''; onChange(tab.join('')) }
              else if (i > 0) { tab[i - 1] = ''; onChange(tab.join('')); refs.current[i - 1]?.focus() }
            } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
            else if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus()
          }}
          onFocus={e => e.target.select()}
          className="w-full min-w-0 h-14 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-center text-2xl font-semibold tabular-nums text-stone-900 dark:text-stone-50 outline-none focus:border-orange-700 dark:focus:border-orange-500 focus:ring-4 focus:ring-orange-700/10 disabled:opacity-50"
        />
      ))}
    </div>
  )
}

// ─── Choix Acheter / Vendre ───────────────────────────────────────────────────

export function RoleChoice({
  value, onChange, label,
  options,
}: {
  value: 'CLIENT' | 'VENDEUR'
  onChange: (v: 'CLIENT' | 'VENDEUR') => void
  label: string
  options: { value: 'CLIENT' | 'VENDEUR'; title: string; desc: string; icon: LucideIcon }[]
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3">
      {options.map(({ value: v, title, desc, icon: Icon }) => {
        const on = value === v
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={`text-start rounded-xl p-3.5 flex flex-col gap-1.5 border transition-colors ${on
              ? 'border-orange-700 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/40 ring-1 ring-orange-700 dark:ring-orange-500'
              : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-stone-400 dark:hover:border-stone-600'}`}
          >
            <Icon className={`w-5 h-5 ${on ? 'text-orange-700 dark:text-orange-400' : 'text-stone-500 dark:text-stone-400'}`} />
            <span className="font-semibold text-stone-900 dark:text-stone-50">{title}</span>
            <span className="text-xs text-stone-500 dark:text-stone-400">{desc}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Règles du mot de passe ───────────────────────────────────────────────────

export function RuleChips({ rules }: { rules: { ok: boolean; label: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-live="polite">
      {rules.map(({ ok, label }) => (
        <li
          key={label}
          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${ok
            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'}`}
        >
          {ok && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
          {label}
        </li>
      ))}
    </ul>
  )
}

/** Classes des listes déroulantes (wilaya / commune) assorties aux champs. */
export const authSelectCls =
  'w-full h-[52px] md:h-12 px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 ' +
  'text-base md:text-[15px] text-stone-900 dark:text-stone-100 outline-none focus:border-orange-700 dark:focus:border-orange-500 ' +
  'focus:ring-4 focus:ring-orange-700/10 disabled:opacity-50'
export const authLabelCls = 'block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5'
