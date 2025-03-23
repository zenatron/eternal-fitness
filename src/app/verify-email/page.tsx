'use client'

import { motion } from 'framer-motion'
import { EnvelopeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function VerifyEmail() {
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
                <EnvelopeIcon className="w-16 h-16" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Check Your Email</h1>
                <p className="text-blue-100 mt-1">{"We've sent you a verification link"}</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="text-center space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                {"Please click the link in your email to verify your account and continue."}
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
                <p>{"Didn't receive the email?"}</p>
                <p>{"Check your spam folder or contact support."}</p>
              </div>
            </div>

            <Link 
              href="/login"
              className="btn btn-primary w-full inline-flex items-center justify-center gap-2"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              {"Return to Login"}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
} 