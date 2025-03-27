'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { IoScaleOutline } from "react-icons/io5";
import { LuPersonStanding } from "react-icons/lu";
import { CgGym } from "react-icons/cg";
import { PiSignOut } from "react-icons/pi";
import { useRouter } from 'next/navigation';

import { 
  UserCircleIcon, 
  ChartBarIcon,
  CalendarDaysIcon,
  PencilSquareIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'
import { SignOutButton, useUser } from '@clerk/nextjs'
import { SignedIn } from '@clerk/nextjs'
import SavedWorkouts from '@/components/FavoriteWorkouts'

interface ProfileData {
  name: string
  age: number | null
  gender: string | null
  height: number | null
  weight: number | null
  workoutsCompleted: number
  joinDate: string
  points: number | null
}

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [useMetricDisplay, setUseMetricDisplay] = useState(false)
  const router = useRouter();
  
  useEffect(() => {
    fetchProfile()
  }, [])
  
  // Separate useEffect for the redirect
  useEffect(() => {
    // Only redirect after loading is complete and profile is null or needs setup
    if (!loading && (!profile || !profile.name)) {
      router.push('/profile/setup')
    }
  }, [loading, profile, router])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
      } else if (response.status === 404) {
        const errorData = await response.json()
        if (errorData.needsSetup) {
          router.push('/profile/setup')
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayValue = (value: number | null, isHeight: boolean) => {
    if (!value) return ''
    if (useMetricDisplay) return value.toFixed(1)
    // Convert metric to imperial for display
    return isHeight ? 
      (value / 2.54).toFixed(1) : // cm to inches
      (value * 2.205).toFixed(1)  // kg to lbs
  }

  const getUnitLabel = (isHeight: boolean) => {
    return useMetricDisplay ? 
      (isHeight ? 'cm' : 'kg') : 
      (isHeight ? 'in' : 'lbs')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-12 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-6">
                <UserCircleIcon className="w-24 h-24" />
                <div>
                  <h1 className="text-3xl font-bold">{profile?.name}</h1>
                  <p className="text-blue-100 mt-1">Member since {new Date(profile?.joinDate || "").toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <TrophyIcon className="w-8 h-8 text-yellow-300" />
                <div>
                  <p className="text-sm text-blue-100">Total Points</p>
                  <p className="text-2xl font-bold">{profile?.points || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-8">
            <div className="flex justify-end mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={useMetricDisplay}
                  onChange={(e) => setUseMetricDisplay(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-primary">Use metric system</label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6"
              >
                <div className="flex items-center gap-4">
                  <CgGym className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-secondary">Workouts Completed</p>
                    <p className="text-2xl font-bold text-heading">{profile?.workoutsCompleted || 0}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6"
              >
                <div className="flex items-center gap-4">
                  <IoScaleOutline className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-secondary">Current Weight</p>
                    <p className="text-2xl font-bold text-heading">
                      {getDisplayValue(profile?.weight || 0, false)} {getUnitLabel(false)}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6"
              >
                <div className="flex items-center gap-4">
                  <LuPersonStanding className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-secondary">Height</p>
                    <p className="text-2xl font-bold text-heading">
                      {getDisplayValue(profile?.height || 0, true)} {getUnitLabel(true)}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/workout/create"
                className="btn btn-primary flex-1 inline-flex items-center justify-center gap-2"
              >
                <CalendarDaysIcon className="w-5 h-5" />
                Create Workout
              </Link>
              <Link
                href="/profile/edit"
                className="btn btn-secondary flex-1 inline-flex items-center justify-center gap-2"
              >
                <PencilSquareIcon className="w-5 h-5" />
                Edit Profile
              </Link>
              <SignedIn>
                <Link 
                  href="/account"
                  className="btn btn-secondary flex-1 inline-flex items-center justify-center gap-2"
                >
                  <UserCircleIcon className="w-5 h-5" />
                  Manage Account
                </Link>
                <SignOutButton
                  redirectUrl="/login"
                >
                  <button className="btn btn-danger flex-1 inline-flex items-center justify-center gap-2">
                    Sign Out
                    <PiSignOut className="w-5 h-5" />
                  </button>
                </SignOutButton>
              </SignedIn>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Workouts Section */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mt-6">
          <div className="p-8">
            <SavedWorkouts />
          </div>
        </div>
      </div>
    </div>
  )
} 