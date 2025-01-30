'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  UserCircleIcon, 
  PencilSquareIcon, 
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  ScaleIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

interface ProfileData {
  name: string
  age: number
  gender: string
  height: number
  weight: number
  useMetric: boolean
  workoutsCompleted: number
  joinDate: string
}

export default function Profile() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError
        if (!profileData) {
          router.push('/profile/setup')
          return
        }

        setProfile({
          name: profileData.name,
          age: profileData.age,
          gender: profileData.gender,
          height: profileData.height,
          weight: profileData.weight,
          useMetric: profileData.use_metric,
          workoutsCompleted: profileData.workouts_completed || 0,
          joinDate: profileData.created_at
        })
      } catch (err) {
        console.error('Error loading profile:', err)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-12 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex items-center gap-6">
              <UserCircleIcon className="w-24 h-24" />
              <div>
                <h1 className="text-3xl font-bold">{profile?.name}</h1>
                <p className="text-blue-100 mt-1">Member since {new Date(profile?.joinDate || '').toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6"
              >
                <div className="flex items-center gap-4">
                  <ChartBarIcon className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Workouts Completed</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.workoutsCompleted || 0}</p>
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
                  <ScaleIcon className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Current Weight</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profile?.weight} {profile?.useMetric ? 'kg' : 'lbs'}
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
                  <CalendarDaysIcon className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Age</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.age} years</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link 
                href="/workout"
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
              <button
                onClick={handleSignOut}
                className="btn btn-danger flex-1 inline-flex items-center justify-center gap-2"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 