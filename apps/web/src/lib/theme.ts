'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'rumo-theme'
const CHANGE_EVENT = 'rumo-theme-change'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system' // storage may be blocked (private mode, disabled site data)
  }
}

function applyTheme(preference: ThemePreference) {
  const dark = preference === 'dark' || (preference === 'system' && matchMedia(DARK_QUERY).matches)
  document.documentElement.classList.toggle('dark', dark)
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange) // other tabs
  window.addEventListener(CHANGE_EVENT, onChange) // this tab
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

/** Current preference + setter. Applies the theme and follows the OS while on "system". */
export function useTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => 'system' as const)

  useEffect(() => {
    applyTheme(preference)
    if (preference !== 'system') return
    const media = matchMedia(DARK_QUERY)
    const onSystemChange = () => applyTheme('system')
    media.addEventListener('change', onSystemChange)
    return () => media.removeEventListener('change', onSystemChange)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore: the theme still applies for this page view
    }
    applyTheme(next)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  return { preference, setPreference }
}
