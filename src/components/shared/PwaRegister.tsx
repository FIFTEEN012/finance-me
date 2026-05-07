'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner]       = useState(false)
  const [installed, setInstalled]         = useState(false)

  useEffect(() => {
    /* Register service worker */
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => console.warn('[SW] registration failed:', err))
    }

    /* Capture install prompt */
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      // Show banner after a short delay if not already dismissed
      const dismissed = sessionStorage.getItem('pwa-banner-dismissed')
      if (!dismissed) setTimeout(() => setShowBanner(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)

    /* Track installed state */
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShowBanner(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setShowBanner(false)
    setInstallPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    sessionStorage.setItem('pwa-banner-dismissed', '1')
  }

  if (!showBanner || installed) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border bg-white dark:bg-[oklch(0.09_0.025_272)] border-gray-200 dark:border-white/[0.08]">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex-shrink-0 shadow-[0_2px_12px_rgba(124,58,237,0.4)]">
          <Download className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">ติดตั้ง FinanceMe</p>
          <p className="text-xs text-gray-500 dark:text-white/40">ใช้งานแบบ offline บนหน้าจอหลักได้เลย</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
          >
            ติดตั้ง
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
