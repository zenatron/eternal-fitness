'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

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
    useMetric: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const toggleUnit = () => {
    setFormData(prev => {
      const useMetric = !prev.useMetric
      // Convert values when switching units
      return {
        ...prev,
        useMetric,
        height: prev.height ? convertHeight(prev.height, useMetric) : 0,
        weight: prev.weight ? convertWeight(prev.weight, useMetric) : 0
      }
    })
  }

  const convertHeight = (value: number, toMetric: boolean) => {
    if (!value) return 0
    return toMetric ? 
      (value * 2.54) as number : // inches to cm
      (value / 2.54) as number   // cm to inches
  }

  const convertWeight = (value: number, toMetric: boolean) => {
    if (!value) return 0
    return toMetric ?
      (value / 2.205) as number : // lbs to kg
      (value * 2.205) as number   // kg to lbs
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

      // Ensure values are in metric for storage (our API expects metric)
      const dataToSend = {
        name: formData.name,
        age: Number(formData.age),
        gender: formData.gender,
        // Convert to metric if using imperial
        height: formData.useMetric ? Number(formData.height) : convertHeight(Number(formData.height), true),
        weight: formData.useMetric ? Number(formData.weight) : convertWeight(Number(formData.weight), true)
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

              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  onClick={toggleUnit}
                  className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
                >
                  Switch to {formData.useMetric ? 'Imperial' : 'Metric'}
                </button>
              </div>

              <div>
                <label className="form-item-heading">
                  Height ({formData.useMetric ? 'cm' : 'inches'})
                </label>
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
                <label className="form-item-heading">
                  Weight ({formData.useMetric ? 'kg' : 'lbs'})
                </label>
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
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
              
              <button
                type="button"
                onClick={async () => {
                  const response = await fetch('/auth/sign-out', { method: 'POST' })
                  if (response.ok) router.push('/login')
                }}
                className="btn btn-secondary flex-1 inline-flex items-center justify-center gap-2"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
} 