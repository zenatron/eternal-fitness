'use client'

import { UserProfile } from '@clerk/nextjs'
import { useTheme } from 'next-themes'
import { dark } from '@clerk/themes'

export default function AccountPage() {
  const { resolvedTheme } = useTheme()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 flex justify-center">
      <div className="w-full max-w-5xl flex justify-center">
        <UserProfile appearance={{
          baseTheme: resolvedTheme === 'dark' ? dark : undefined,
        }}/>
      </div>
    </div>
  )
} 