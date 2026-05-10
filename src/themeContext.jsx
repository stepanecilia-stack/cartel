/* eslint-disable react-refresh/only-export-components -- провайдер темы и хук в одном модуле */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { readStoredThemeIsDark, writeStoredThemeIsDark } from './themeStorage'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => readStoredThemeIsDark())

  useEffect(() => {
    const root = document.documentElement
    if (isDark) root.classList.add('dark')
    else root.classList.remove('dark')
    writeStoredThemeIsDark(isDark)
  }, [isDark])

  const value = useMemo(
    () => ({
      isDark,
      toggleTheme: () => setIsDark((v) => !v),
    }),
    [isDark],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme: оберните приложение в ThemeProvider')
  }
  return ctx
}
