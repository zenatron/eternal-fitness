'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/lib/hooks/useProfile';
import { useUpdateProfile } from '@/lib/hooks/useMutations';
import Link from 'next/link'
import { Switch } from '@headlessui/react'
import { ArrowLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline'

export default function EditProfilePage() {
  const router = useRouter()
  const { profile, isLoading: profileLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    height: '',
    weight: '',
    age: '',
    gender: '',
    useMetric: true,
    weightGoal: '',
  })
  
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Populate form with existing data when it loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        height: profile.height ? String(profile.height) : '',
        weight: profile.weight ? String(profile.weight) : '',
        age: profile.age ? String(profile.age) : '',
        gender: profile.gender || '',
        useMetric: profile.useMetric !== undefined ? profile.useMetric : true,
        weightGoal: profile.weightGoal ? String(profile.weightGoal) : '',
      })
    }
  }, [profile])
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    })
  }
  
  const toggleUnit = () => {
    setFormData(prev => ({
      ...prev,
      useMetric: !prev.useMetric
    }))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    
    // Convert values to numbers where needed
    const processedData = {
      ...formData,
      height: formData.height ? parseFloat(formData.height) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      age: formData.age ? parseInt(formData.age) : null,
      weightGoal: formData.weightGoal ? parseFloat(formData.weightGoal) : null,
    }
    
    try {
      await updateProfileMutation.mutateAsync(processedData);
      router.push('/profile')
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('Failed to update profile. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }
  
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen app-bg py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link 
            href="/profile" 
            className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back to Profile</span>
          </Link>
        </div>
        
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-8 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex items-center gap-4">
              <UserCircleIcon className="w-16 h-16" />
              <div>
                <h1 className="text-2xl font-bold">Edit Profile</h1>
                <p className="text-blue-100 mt-1">Update your personal information</p>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="p-4 m-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="p-8">
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
                />
              </div>

              <div>
                <label className="form-item-heading">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="form-input"
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
                />
              </div>

              <div>
                <label className="form-item-heading">Weight Goal ({formData.useMetric ? 'kg' : 'lbs'}) (Optional)</label>
                <input
                  type="number"
                  name="weightGoal"
                  value={formData.weightGoal || ''}
                  onChange={handleChange}
                  className="form-input"
                  step="0.1"
                />
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
              <button 
                type="submit" 
                className="btn btn-primary w-full py-3"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 