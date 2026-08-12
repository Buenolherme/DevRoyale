import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Theme } from '@/types'
import { ThemeContext } from './theme-context'

const STORAGE_KEY = 'devroyale-theme'

function getInitialTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // O tema do sistema continua disponível quando o armazenamento é bloqueado.
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme
    document
      .querySelector<HTMLMetaElement>('#devroyale-theme-color')
      ?.setAttribute('content', theme === 'dark' ? '#0f0f12' : '#fffaf2')
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // O tema visual não depende da persistência local para funcionar.
    }
  }, [theme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
