/** Ключ localStorage для ручной темы (совпадает со скриптом в index.html). */
export const THEME_STORAGE_KEY = 'cartel-theme'

export function readStoredThemeIsDark() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark'
  } catch {
    return false
  }
}

export function writeStoredThemeIsDark(isDark) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light')
  } catch {
    /* ignore */
  }
}
