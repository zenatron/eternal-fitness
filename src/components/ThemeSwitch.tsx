'use client'

import { FaSun, FaMoon } from 'react-icons/fa'
import { useTheme } from '@/contexts/ThemeContext'
import { useEffect, useState } from 'react'

export default function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Only show the UI after mounting to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null // Return null on server-side and first render
  }

  return (
    <div
      onClick={toggleTheme}
      className="relative w-16 h-8 bg-gray-300 dark:bg-gray-600 rounded-full cursor-pointer p-1 transition-colors duration-300"
    >
      {/* Sliding Circle */}
      <div
        className={`w-6 h-6 bg-white dark:bg-gray-900 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${
          theme === 'dark' ? 'translate-x-8' : 'translate-x-0'
        }`}
      >
        {/* Sun Icon for Light Mode */}
        {theme === 'light' ? (
          <FaSun className="text-yellow-500 w-4 h-4 transition-opacity duration-300" />
        ) : (
          <FaMoon className="text-blue-400 w-4 h-4 transition-opacity duration-300" />
        )}
      </div>
    </div>
  )
} 