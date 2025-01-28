'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import ThemeSwitch from './ThemeSwitch'
import { FaUser } from 'react-icons/fa'
import type { User } from '@supabase/auth-helpers-nextjs'

interface HeaderProps {
  user: User | null
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <header className="bg-gray-800 text-white py-4 px-8 flex justify-between items-center dark:bg-gray-900 dark:text-gray-300">
      {/* Website Logo/Title */}
      <Link href="/" className="text-2xl text-left font-bold gradient-text-apple inline-block">
        Eternal Fitness
      </Link>

      {/* Navigation and User Section */}
      <nav className="flex items-center space-x-6">
        {user ? (
          <div className="flex items-center space-x-4">
            <Link 
              href="/profile"
              className="hover:text-blue-400 transition-colors duration-200"
              title="View Profile"
            >
              <FaUser className="w-5 h-5" />
            </Link>
            <button onClick={handleLogout} className="btn btn-danger">
              Logout
            </button>
          </div>
        ) : (
          <Link href="/login" className="btn btn-primary">
            Login
          </Link>
        )}

        {/* Dark Mode Toggle */}
        <ThemeSwitch />
      </nav>
    </header>
  )
} 