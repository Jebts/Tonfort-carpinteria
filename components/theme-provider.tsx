'use client'

import * as React from 'react'

export type Theme = 'light' | 'dark' | 'system'

export interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  themes: Theme[]
  systemTheme?: 'light' | 'dark'
}

const STORAGE_KEY = 'tonfort-theme'
const MEDIA = '(prefers-color-scheme: dark)'

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  themes: ['light', 'dark', 'system'],
})

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia(MEDIA).matches ? 'dark' : 'light'
}

function resolveTheme(theme: Theme, enableSystem: boolean): 'light' | 'dark' {
  if (theme === 'system') return enableSystem ? getSystemTheme() : 'light'
  return theme
}

function applyToDocument(resolved: 'light' | 'dark', attribute: string) {
  const root = document.documentElement
  if (attribute === 'class') {
    root.classList.toggle('dark', resolved === 'dark')
  } else {
    root.setAttribute(attribute, resolved)
  }
  root.style.colorScheme = resolved
}

export function useTheme(): ThemeContextValue {
  return React.useContext(ThemeContext)
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  enableSystem = true,
  attribute = 'class',
  disableTransitionOnChange = false,
}: {
  children: React.ReactNode
  defaultTheme?: Theme
  enableSystem?: boolean
  attribute?: string
  disableTransitionOnChange?: boolean
}) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>(
    () => (typeof window === 'undefined' ? 'light' : getSystemTheme())
  )

  // Lee la preferencia guardada una vez en el cliente (sin <script>, sin error de React).
  React.useEffect(() => {
    let stored: Theme | null = null
    try {
      stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    } catch {
      // localStorage no disponible (SSR / privado): se usa el default.
    }
    const initial: Theme = stored && ['light', 'dark', 'system'].includes(stored) ? stored : defaultTheme
    const resolved = resolveTheme(initial, enableSystem)
    setThemeState(initial)
    setResolvedTheme(resolved)
    applyToDocument(resolved, attribute)
  }, [defaultTheme, enableSystem, attribute])

  // Sigue los cambios del sistema cuando el tema es 'system'.
  React.useEffect(() => {
    if (theme !== 'system' || !enableSystem || typeof window === 'undefined') return
    const mq = window.matchMedia(MEDIA)
    const handler = (e: MediaQueryListEvent) => {
      const r = e.matches ? 'dark' : 'light'
      setResolvedTheme(r)
      applyToDocument(r, attribute)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme, enableSystem, attribute])

  const setTheme = (next: Theme) => {
    setThemeState(next)
    const resolved = resolveTheme(next, enableSystem)
    setResolvedTheme(resolved)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // localStorage no disponible: se ignora.
    }
    if (disableTransitionOnChange) {
      const style = document.createElement('style')
      style.textContent =
        '*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}'
      document.head.appendChild(style)
      window.getComputedStyle(document.body)
      setTimeout(() => document.head.removeChild(style), 1)
    }
    applyToDocument(resolved, attribute)
  }

  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme,
    themes: ['light', 'dark', 'system'],
    systemTheme: enableSystem ? getSystemTheme() : undefined,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}