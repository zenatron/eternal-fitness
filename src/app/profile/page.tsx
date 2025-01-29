import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/profile/setup')
  }

  const formatMeasurement = (value: number, isMetric: boolean, type: 'height' | 'weight') => {
    if (type === 'height') {
      return `${value.toFixed(1)} ${isMetric ? 'cm' : 'inches'}`
    }
    return `${value.toFixed(1)} ${isMetric ? 'kg' : 'lbs'}`
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-800">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 p-6 rounded shadow-md space-y-6">
        <h1 className="text-2xl font-bold text-center gradient-text-blue">Your Profile</h1>
        
        <div className="space-y-4">
          <div>
            <h2 className="form-item-heading">Name</h2>
            <p className="text-gray-700 dark:text-gray-300">{profile.name}</p>
          </div>

          <div>
            <h2 className="form-item-heading">Age</h2>
            <p className="text-gray-700 dark:text-gray-300">{profile.age} years</p>
          </div>

          <div>
            <h2 className="form-item-heading">Gender</h2>
            <p className="text-gray-700 dark:text-gray-300">
              {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
            </p>
          </div>

          <div>
            <h2 className="form-item-heading">Height</h2>
            <p className="text-gray-700 dark:text-gray-300">
              {formatMeasurement(profile.height, profile.use_metric, 'height')}
            </p>
          </div>

          <div>
            <h2 className="form-item-heading">Weight</h2>
            <p className="text-gray-700 dark:text-gray-300">
              {formatMeasurement(profile.weight, profile.use_metric, 'weight')}
            </p>
          </div>
        </div>

        <div className="flex flex-col space-y-3 pt-4">
          <Link href="/profile/edit" className="btn btn-secondary w-full">
            Edit Profile
          </Link>
          <form action="/auth/sign-out" method="post">
            <button type="submit" className="btn btn-danger w-full">
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
} 