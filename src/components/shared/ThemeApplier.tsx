'use client'

import { useEffect } from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'

/**
 * Reads accentColor from settings and applies data-accent to <html>.
 * Must be rendered inside AppShell (client boundary).
 */
export function ThemeApplier() {
  const accentColor = useSettingsStore((s) => s.accentColor)

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentColor)
  }, [accentColor])

  return null
}
