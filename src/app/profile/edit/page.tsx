'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/lib/hooks/useProfile';
import { useUpdateProfile } from '@/lib/hooks/useMutations';
import Link from 'next/link'
import { motion } from 'framer-motion'
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
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-6 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form fields go here - keep your existing form fields */}
          
          <div className="pt-4">
            <button 
              type="submit" 
              className="btn btn-primary w-full"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 