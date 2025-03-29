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
        <div className="flex justify-center">
          <SignUp
            path="/signup"
            appearance={{
              baseTheme: resolvedTheme === 'dark' ? dark : undefined,
              elements: {
                rootBox: "flex items-center justify-center w-full max-w-md",
                card: "bg-white dark:bg-gray-800 shadow-xl rounded-2xl",
                headerTitle: "text-3xl font-bold text-heading",
                headerSubtitle: "text-secondary mt-1",
                formFieldLabel: "text-secondary",
                formFieldInput: "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500",
                formButtonPrimary: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200",
                footerActionLink: "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300",
                socialButtonsBlockButton: "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600",
                dividerLine: "bg-gray-300 dark:bg-gray-600",
                dividerText: "text-gray-500 dark:text-gray-400",
                headerLogoImage: "w-16 h-16",
                headerLogoBox: "p-3 bg-white/10 rounded-xl",
              },
              variables: {
                colorPrimary: resolvedTheme === 'dark' ? "#60a5fa" : "#3b82f6",
                colorBackground: resolvedTheme === 'dark' ? "#101828" : "#f9fafb",
                colorText: resolvedTheme === 'dark' ? "#f3f4f6" : "#1f2937",
                colorTextSecondary: resolvedTheme === 'dark' ? "#9ca3af" : "#6b7280",
                borderRadius: "1rem",
              },
              layout: {
                socialButtonsVariant: "blockButton",
                socialButtonsPlacement: "bottom",
              },
            }}
            routing="path"
            signInUrl="/login"
          />
        </div>
      </motion.div>
    </div>
  )
} 