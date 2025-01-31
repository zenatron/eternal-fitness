'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import ThemeSwitch from './ThemeSwitch'
import { FaUser } from 'react-icons/fa'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { User } from '@supabase/auth-helpers-nextjs'

interface HeaderProps {
  user: User | null
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setIsMenuOpen(false)
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const menuVariants = {
    closed: {
      opacity: 0,
      x: "100%",
      transition: {
        duration: 0.2
      }
    },
    open: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3
      }
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-slate-800 dark:bg-gray-950 shadow-sm z-[40] h-16 px-6 flex items-center justify-between">
      {/* Website Logo/Title */}
      <Link href="/" className="text-2xl text-left font-bold gradient-text-apple inline-block">
        Eternal Fitness
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center space-x-6">
        {user ? (
          <Link 
            href="/profile"
            className="text-gray-100 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-200"
            title="View Profile"
          >
            <FaUser className="w-5 h-5" />
          </Link>
        ) : (
          <Link href="/login" className="btn btn-primary">
            Login
          </Link>
        )}
        <ThemeSwitch />
      </nav>

      {/* Mobile Hamburger Button */}
      <button 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="md:hidden flex flex-col justify-center items-center w-6 h-6 space-y-1.5 focus:outline-none"
        aria-label="Toggle menu"
      >
        <span 
          className={`w-6 h-0.5 bg-white transform transition-all duration-300 ${
            isMenuOpen ? 'rotate-45 translate-y-2' : ''
          }`}
        />
        <span 
          className={`w-6 h-0.5 bg-white transition-all duration-300 ${
            isMenuOpen ? 'opacity-0' : ''
          }`}
        />
        <span 
          className={`w-6 h-0.5 bg-white transform transition-all duration-300 ${
            isMenuOpen ? '-rotate-45 -translate-y-2' : ''
          }`}
        />
      </button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Menu */}
            <motion.div
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="fixed right-0 top-0 h-screen w-64 bg-gray-800 dark:bg-gray-900 p-6 md:hidden shadow-lg"
            >
              <div className="flex flex-col space-y-6">
                {user ? (
                  <>
                    <Link 
                      href="/profile"
                      className="flex items-center space-x-2 text-lg text-gray-100 dark:text-gray-200 hover:text-blue-400 dark:hover:text-blue-400 transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <FaUser className="w-5 h-5" />
                      <span>Profile</span>
                    </Link>
                    <button 
                      onClick={handleLogout} 
                      className="btn btn-danger w-full"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link 
                    href="/login" 
                    className="btn btn-primary w-full"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                )}
                <div className="pt-4 border-t border-gray-700">
                  <ThemeSwitch />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
} 