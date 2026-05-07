'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

function getStoredTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark'
}

function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  localStorage.setItem('theme', theme)
}

export function ThemeToggle() {
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = getStoredTheme()
    applyTheme(stored)
    setThemeState(stored)
    setMounted(true)
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setThemeState(next)
  }

  if (!mounted) return <div className="w-8 h-8" />

  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
      title={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
