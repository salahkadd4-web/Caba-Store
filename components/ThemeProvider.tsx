'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'
type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Valeur initiale neutre — évite tout problème SSR / Capacitor WebView
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // ── Lecture du localStorage uniquement après le montage côté client ─────────
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      setThemeState(saved)
    } else {
      setThemeState('dark') // valeur par défaut
    }
    setMounted(true)
  }, [])

  // ── Application du thème à chaque changement ───────────────────────────────
  useEffect(() => {
    if (!mounted) return

    const systemDark = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && systemDark.matches)
      applyTheme(isDark)
      setResolvedTheme(isDark ? 'dark' : 'light')
    }

    apply()
    systemDark.addEventListener('change', apply)
    return () => systemDark.removeEventListener('change', apply)
  }, [theme, mounted])

  const setTheme = (t: Theme) => {
    // 1. Persiste en localStorage
    localStorage.setItem('theme', t)

    // 2. Met à jour le state React (déclenche le useEffect ci-dessus)
    setThemeState(t)

    // 3. Applique IMMÉDIATEMENT sans attendre le prochain rendu React
    //    → clé pour Capacitor WebView où le cycle React peut être retardé
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)')
    const isDark =
      t === 'dark' ||
      (t === 'system' && systemDark.matches)
    applyTheme(isDark)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)