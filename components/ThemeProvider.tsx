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

// ✅ Lecture du localStorage en dehors du composant (s'exécute une seule fois)
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light' // SSR guard
  const saved = localStorage.getItem('theme')
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  return 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // ✅ Initialisation paresseuse — pas d'effet, pas de double rendu
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const root = document.documentElement
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && systemDark.matches)
      root.classList.toggle('dark', isDark)
      setResolvedTheme(isDark ? 'dark' : 'light') // ✅ setState dans un callback, pas dans le corps
    }

    apply()
    systemDark.addEventListener('change', apply)
    return () => systemDark.removeEventListener('change', apply)
  }, [theme])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('theme', t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)