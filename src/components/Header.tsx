'use client';

import Link from 'next/link';
import ThemeSwitch from './theme/ThemeSwitch';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import { UserCircleIcon, ArrowRightStartOnRectangleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { data: session } = useSession();

  const menuVariants = {
    closed: {
      opacity: 0,
      x: '100%',
      transition: { duration: 0.2 },
    },
    open: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3 },
    },
  };

  const userInitial = session?.user?.name?.charAt(0)?.toUpperCase() || session?.user?.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <header className="fixed top-0 left-0 right-0 bg-slate-800 dark:bg-gray-950 shadow-sm z-[40] h-16 px-6 flex items-center justify-between">
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

      <nav className="hidden md:flex items-center space-x-6">
        {session ? (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-sm font-medium"
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                {userInitial}
              </span>
            </button>

            <AnimatePresence>
              {isUserMenuOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-10"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-gray-800 dark:bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-20 py-2"
                  >
                    <div className="px-4 py-2 border-b border-gray-700">
                      <p className="text-sm font-medium text-white truncate">
                        {session.user?.name || session.user?.email}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {session.user?.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                    >
                      <UserCircleIcon className="w-5 h-5" />
                      Profile
                    </Link>
                    <Link
                      href="/profile/edit"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                    >
                      <Cog6ToothIcon className="w-5 h-5" />
                      Settings
                    </Link>
                    <div className="border-t border-gray-700 mt-1 pt-1">
                      <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-white/10 transition-colors w-full"
                      >
                        <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ) : null}

        <ThemeSwitch />
      </nav>

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

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />

            <motion.div
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="fixed right-0 top-0 h-screen w-64 bg-gray-800 dark:bg-gray-900 p-6 md:hidden shadow-lg"
            >
              <div className="flex flex-col space-y-6">
                {session ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {userInitial}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white truncate">
                          {session.user?.name || session.user?.email}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 text-sm text-gray-200 hover:text-white transition-colors"
                    >
                      <UserCircleIcon className="w-5 h-5" />
                      Profile
                    </Link>
                    <Link
                      href="/profile/edit"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 text-sm text-gray-200 hover:text-white transition-colors"
                    >
                      <Cog6ToothIcon className="w-5 h-5" />
                      Settings
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="flex items-center gap-3 text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-sm text-gray-200 hover:text-white transition-colors"
                  >
                    Sign In
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
  );
}
