'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { triggerSyncNow } from '@/lib/cloudSync'
import { isNativeApp, nativePlatform } from '@/lib/native'

/**
 * Native app integration (iOS / Android via Capacitor). Renders nothing and
 * does nothing in a normal browser.
 * - Hides the splash screen once the web app is running.
 * - Status bar colours follow the light/dark theme.
 * - Android hardware back button navigates back, and leaves the app at the root.
 * - Coming back to the app triggers a sync, so edits made on the web show up.
 */
export function NativeBridge() {
  const router = useRouter()

  useEffect(() => {
    if (!isNativeApp()) return
    document.documentElement.classList.add('native-app', `native-${nativePlatform()}`)

    const cleanups: Array<() => void> = []
    let disposed = false

    ;(async () => {
      const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import('@capacitor/app'),
        import('@capacitor/status-bar'),
        import('@capacitor/splash-screen'),
      ])
      if (disposed) return

      SplashScreen.hide().catch(() => {})

      const applyStatusBar = () => {
        const dark = document.documentElement.classList.contains('dark')
        StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {})
      }
      applyStatusBar()
      const observer = new MutationObserver(applyStatusBar)
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      cleanups.push(() => observer.disconnect())

      const back = await App.addListener('backButton', ({ canGoBack }) => {
        const atRoot = ['/', '/dashboard'].includes(window.location.pathname)
        if (canGoBack && !atRoot) router.back()
        else App.minimizeApp().catch(() => App.exitApp())
      })
      const state = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) triggerSyncNow()
      })
      cleanups.push(() => back.remove(), () => state.remove())
      if (disposed) cleanups.forEach((fn) => fn())
    })().catch(() => {})

    return () => {
      disposed = true
      cleanups.forEach((fn) => fn())
    }
  }, [router])

  return null
}
