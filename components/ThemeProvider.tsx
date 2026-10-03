'use client'
import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark' | 'system'
type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

/** Thème appliqué quand l'utilisateur n'a encore rien choisi (même valeur que le script anti-flash de app/layout.tsx). */
export const DEFAULT_THEME: Theme = 'dark'

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light',
})

// ── Applique le thème directement sur <html> ──────────────────────────────────
// Appelée aussi bien depuis l'effet que depuis setTheme pour être immédiat.
function applyTheme(isDark: boolean) {
  const root = document.documentElement

  // 1. Classe Tailwind
  root.classList.toggle('dark', isDark)

  // 2. Attribut data- (alternative à la classe, utile si Tailwind est configuré
  //    avec darkMode: ['attribute', '[data-theme]'])
  root.setAttribute('data-theme', isDark ? 'dark' : 'light')

  // 3. color-scheme : force le WebView (Capacitor / Safari) à adopter le thème
  //    au niveau du moteur de rendu (scrollbars, inputs, fond système…)
  root.style.colorScheme = isDark ? 'dark' : 'light'
}

// ── Sources externes lues via useSyncExternalStore ────────────────────────────
// Le localStorage et la préférence système vivent hors de React : on s'y abonne
// au lieu de les recopier dans un state depuis un effet.

const THEME_EVENT = 'caba-theme-change'
const DARK_QUERY  = '(prefers-color-scheme: dark)'

function readSavedTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    // localStorage indisponible (navigation privée stricte) → valeur par défaut
  }
  return DEFAULT_THEME
}

function subscribeSavedTheme(onChange: () => void) {
  window.addEventListener('storage', onChange)      // autres onglets
  window.addEventListener(THEME_EVENT, onChange)    // cet onglet (setTheme)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(THEME_EVENT, onChange)
  }
}

function subscribeSystemDark(onChange: () => void) {
  const mq = window.matchMedia(DARK_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

const noopSubscribe = () => () => {}

const isDarkFor = (t: Theme, systemDark: boolean) => t === 'dark' || (t === 'system' && systemDark)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Rendu serveur : valeur neutre ('system' / clair) — le script anti-flash a
  // déjà posé la bonne classe sur <html> avant l'hydratation.
  const theme      = useSyncExternalStore(subscribeSavedTheme, readSavedTheme, () => 'system' as Theme)
  const systemDark = useSyncExternalStore(subscribeSystemDark, () => window.matchMedia(DARK_QUERY).matches, () => false)
  const resolvedTheme: 'light' | 'dark' = isDarkFor(theme, systemDark) ? 'dark' : 'light'
  // false pendant l'hydratation : les valeurs ci-dessus sont alors celles du serveur
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false)

  // ── Application du thème à chaque changement ───────────────────────────────
  useEffect(() => {
    if (hydrated) applyTheme(resolvedTheme === 'dark')
  }, [resolvedTheme, hydrated])

  const setTheme = useCallback((t: Theme) => {
    // 1. Persiste en localStorage
    try { localStorage.setItem('theme', t) } catch { /* indisponible : le choix vaut pour la session */ }

    // 2. Applique IMMÉDIATEMENT sans attendre le prochain rendu React
    //    → clé pour Capacitor WebView où le cycle React peut être retardé
    applyTheme(isDarkFor(t, window.matchMedia(DARK_QUERY).matches))

    // 3. Notifie l'abonnement (re-rendu avec le nouveau thème)
    window.dispatchEvent(new Event(THEME_EVENT))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
