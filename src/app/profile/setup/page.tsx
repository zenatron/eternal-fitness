'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { UserCircleIcon } from '@heroicons/react/24/outline'
import { SignedIn, SignOutButton } from '@clerk/nextjs'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import { Switch } from '@headlessui/react'

interface ProfileFormData {
  name: string
  age: number
  height: number
  weight: number
  gender: string
  useMetric: boolean
}

export default function ProfileSetup() {
  const router = useRouter()
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    age: 0,
    height: 0,
    weight: 0,
    gender: '',
    useMetric: true // Default to metric
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const toggleUnit = () => {
    setFormData(prev => ({
      ...prev,
      useMetric: !prev.useMetric
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate form data
      if (!formData.name) {
        throw new Error('Please enter your name')
      }
      if (!formData.age || formData.age < 13) {
        throw new Error('Please enter a valid age (13 or older)')
      }
      if (!formData.gender) {
        throw new Error('Please select your gender')
      }
      if (!formData.height || formData.height <= 0) {
        throw new Error('Please enter a valid height')
      }
      if (!formData.weight || formData.weight <= 0) {
        throw new Error('Please enter a valid weight')
      }

      // Prepare the request body
      const dataToSend = {
        name: formData.name,
        age: Number(formData.age),
        gender: formData.gender,
        height: Number(formData.height),
        weight: Number(formData.weight),
        useMetric: formData.useMetric
      }
      // First check if we're authenticated
      const authCheck = await fetch('/api/auth/check')
      const authResult = await authCheck.json()
      
      if (!authResult.authenticated) {
        console.error('Authentication check failed:', authResult)
        throw new Error('Not authenticated - please sign in again')
      }
      
      console.log('Auth check passed, user ID:', authResult.userId)

      // Send data to the API
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend),
        // Make sure to include credentials
        credentials: 'include'
      })

      console.log('Profile API response status:', response.status)
      
      if (response.status === 401) {
        throw new Error('Authentication error - please sign in again')
      }

      if (!response.ok) {
        let errorMessage = 'Failed to save profile'
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || `Server error (${response.status})`
          console.error('API error response:', errorData)
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorMessage = `Server error (${response.status}): Failed to parse error response`
        }
        
        throw new Error(errorMessage)
      }

      // Redirect to profile page on success
      router.push('/profile')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      console.error('Profile setup error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-12 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex items-center gap-6">
              <UserCircleIcon className="w-20 h-20" />
              <div>
                <h1 className="text-3xl font-bold">Complete Your Profile</h1>
                <p className="text-blue-100 mt-1">{"Let's personalize your experience"}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-item-heading">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-item-heading">Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age || ''}
                  onChange={handleChange}
                  className="form-input"
                  min="13"
                  max="120"
                  required
                />
              </div>

              <div>
                <label className="form-item-heading">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="form-item-heading">Use Metric System</label>
                  <Switch
                    checked={formData.useMetric}
                    onChange={toggleUnit}
                    className={`${
                      formData.useMetric ? 'bg-blue-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  >
                    <span className="sr-only">Use metric system</span>
                    <span
                      className={`${
                        formData.useMetric ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                </div>
              </div>

              <div>
                <label className="form-item-heading">Height ({formData.useMetric ? 'cm' : 'inches'})</label>
                <input
                  type="number"
                  name="height"
                  value={formData.height || ''}
                  onChange={handleChange}
                  className="form-input"
                  step="0.1"
                  required
                />
              </div>

              <div>
                <label className="form-item-heading">Weight ({formData.useMetric ? 'kg' : 'lbs'})</label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight || ''}
                  onChange={handleChange}
                  className="form-input"
                  step="0.1"
                  required
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <SignedIn>
                <SignOutButton
                  redirectUrl="/login"
                >
                  <button className="btn btn-danger flex-1 inline-flex items-center justify-center gap-2">
                    Sign Out
                    <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
                  </button>
                </SignOutButton>
              </SignedIn>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
} 