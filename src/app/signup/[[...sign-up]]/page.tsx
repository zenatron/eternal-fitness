'use client'

import { motion } from 'framer-motion'
import { SignUp } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { useTheme } from 'next-themes'

export default function SignUpPage() {

  const { resolvedTheme } = useTheme()

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-12 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex items-center gap-6">
              <div className="p-3 bg-white/10 rounded-xl">
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold">Join Eternal Fitness</h1>
                <p className="text-blue-100 mt-1">Create an account to start your fitness journey</p>
              </div>
            </div>
          </div>

          {/* Clerk Sign Up - Embedded directly under header */}
          <div className="flex justify-center">
            <SignUp 
              appearance={{
                baseTheme: resolvedTheme === 'dark' ? dark : undefined,
              }}
              routing="hash"
              signInUrl="/login"
              fallbackRedirectUrl="/profile"
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
} 