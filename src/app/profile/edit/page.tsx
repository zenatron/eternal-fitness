'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Switch } from '@headlessui/react'
import { ArrowLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline'

interface ProfileFormData {
  name: string
  age: number
  height: number
  weight: number
  gender: string
  useMetric: boolean
}

export default function ProfileEdit() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    age: 0,
    height: 0,
    weight: 0,
    gender: '',
    useMetric: false
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()

        // This is what we are getting from the database
        console.log(data.height)
        console.log(data.weight)
        console.log(data.useMetric)
        
        setFormData({
            name: data.name || '',
            age: data.age || 0,
            height: data.height || 0,
            weight: data.weight || 0,
            gender: data.gender || '',
            useMetric: data.useMetric || false
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to load profile data')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const submitData = {
        name: formData.name,
        age: formData.age,
        gender: formData.gender,
        height: formData.height,
        weight: formData.weight,
      }

      console.log(submitData)

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      router.push('/profile')
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('Failed to update profile')
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
                <h1 className="text-3xl font-bold">Edit Profile</h1>
                <p className="text-blue-100 mt-1">Update your personal information</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Age
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Height {formData.useMetric ? '(cm)' : '(in)'}
                </label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Weight {formData.useMetric ? '(kg)' : '(lbs)'}
                </label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Measurement System
                </label>
                <Switch.Group>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={formData.useMetric}
                      onChange={(checked) => setFormData(prev => ({ ...prev, useMetric: checked }))}
                      className={`${
                        formData.useMetric ? 'bg-blue-600' : 'bg-gray-400'
                      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                    >
                      <span
                        className={`${
                          formData.useMetric ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                      />
                    </Switch>
                    <Switch.Label className="text-sm text-gray-600 dark:text-gray-400">
                      {formData.useMetric ? 'Metric (cm/kg)' : 'Imperial (in/lbs)'}
                    </Switch.Label>
                  </div>
                </Switch.Group>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link 
                href="/profile"
                className="btn btn-secondary flex-1 inline-flex items-center justify-center gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </Link>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
} 