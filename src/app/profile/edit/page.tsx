'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

interface ProfileFormData {
  name: string
  age: string
  height: string
  weight: string
  gender: string
  useMetric: boolean
}

export default function ProfileEdit() {
  const router = useRouter()
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    age: '',
    height: '',
    weight: '',
    gender: '',
    useMetric: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialLoad, setInitialLoad] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError
        if (!profile) {
          router.push('/profile/setup')
          return
        }

        setFormData({
          name: profile.name,
          age: profile.age.toString(),
          height: profile.height.toString(),
          weight: profile.weight.toString(),
          gender: profile.gender,
          useMetric: profile.use_metric
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setInitialLoad(false)
      }
    }

    loadProfile()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const toggleUnit = () => {
    setFormData(prev => {
      const useMetric = !prev.useMetric
      return {
        ...prev,
        useMetric,
        height: prev.height ? convertHeight(prev.height, useMetric) : '',
        weight: prev.weight ? convertWeight(prev.weight, useMetric) : ''
      }
    })
  }

  const convertHeight = (value: string, toMetric: boolean) => {
    if (!value) return ''
    const num = parseFloat(value)
    return toMetric ? 
      (num * 2.54).toFixed(1) : // inches to cm
      (num / 2.54).toFixed(1)   // cm to inches
  }

  const convertWeight = (value: string, toMetric: boolean) => {
    if (!value) return ''
    const num = parseFloat(value)
    return toMetric ? 
      (num / 2.205).toFixed(1) : // lbs to kg
      (num * 2.205).toFixed(1)   // kg to lbs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          age: parseInt(formData.age),
          height: parseFloat(formData.height),
          weight: parseFloat(formData.weight),
          gender: formData.gender,
          use_metric: formData.useMetric
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      router.push('/profile')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-800">
        <div className="text-gray-700 dark:text-gray-300">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-800">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 p-6 rounded shadow-md space-y-4">
        <h1 className="text-2xl font-bold text-center gradient-text-blue">Edit Profile</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={formData.age}
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
              value={formData.height}
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
              value={formData.weight}
              onChange={handleChange}
              className="form-input"
              step="0.1"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="flex space-x-4">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <Link 
              href="/profile"
              className="btn btn-secondary flex-1 text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
} 