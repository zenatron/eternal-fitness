'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi'

const themes = [
  { id: 'system', icon: FiMonitor },
  { id: 'light', icon: FiSun },
  { id: 'dark', icon: FiMoon },
] as const

export default function ThemeSwitch() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const currentIndex = themes.findIndex(t => t.id === theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex].id)
  }

  if (!mounted) {
    return (
      <button
        className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors duration-200"
        aria-label="Theme settings"
      >
        <span className="opacity-0">Loading...</span>
      </button>
    )
  }

  const currentTheme = themes.find(t => t.id === theme) || themes[0]
  const CurrentIcon = currentTheme.icon

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors duration-200"
      aria-label="Toggle theme"
      title={`Current theme: ${currentTheme.id}`}
    >
      <CurrentIcon className="w-4 h-4" />
    </button>
  )
} 