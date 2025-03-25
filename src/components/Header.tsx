'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ThemeSwitch from './ThemeSwitch'
import { FaUser } from 'react-icons/fa'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SignedOut, SignedIn, SignInButton, UserButton } from '@clerk/nextjs'

export function Header() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">
          <Link 
            href="/" 
            className="
              bg-clip-text text-transparent 
              bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500
              hover:animate-gradient-x
              bg-[size:200%]
            "
          >
            Eternal Fitness
          </Link>
        </h1>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center space-x-6">
        <SignedIn>
          <UserButton 
            userProfileMode="navigation" 
            userProfileUrl="/profile"
          />
        </SignedIn>
        <SignedOut>
          <SignInButton />
        </SignedOut>
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
                <SignedIn>
                  <UserButton 
                    userProfileMode="navigation" 
                    userProfileUrl="/profile"
                  />
                </SignedIn>
                <SignedOut>
                  <SignInButton />
                </SignedOut>
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