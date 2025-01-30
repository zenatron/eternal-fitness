'use client'

import { FormData } from '@/types'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { QuestionMarkCircleIcon, PencilIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface FormSectionProps {
  formData: FormData
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  handleSubmit: (e: React.FormEvent) => void
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
}

interface TooltipLabelProps {
  text: string
  tooltip: string
}

function TooltipLabel({ text, tooltip }: TooltipLabelProps) {
  return (
    <div className="flex items-center gap-1.5 mb-2 group">
      <span className="form-item-heading">{text}</span>
      <div className="relative inline-flex items-center -mt-0.5">
        <QuestionMarkCircleIcon 
          className="h-4 w-4 text-blue-500 hover:text-blue-600 cursor-help transition-colors" 
          aria-hidden="true"
        />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-blue-600"></div>
        </div>
      </div>
    </div>
  )
}

export default function FormSection({ formData, handleChange, handleSubmit, setFormData }: FormSectionProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [useMetric, setUseMetric] = useState(false)

  useEffect(() => {
    async function loadProfileData() {
      setIsLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUseMetric(profile.useMetric || false)
          setFormData(prev => ({
            ...prev,
            name: profile.name || '',
            age: profile.age?.toString() || '',
            gender: profile.gender || '',
            height: profile.height?.toString() || '',
            weight: profile.weight?.toString() || '',
          }))
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfileData()
  }, [setFormData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading profile data...</p>
        </div>
      </div>
    )
  }

  const capitalizeFirstLetter = (str: string) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-12 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-center gap-6">
            <ClipboardDocumentListIcon className="w-20 h-20" />
            <div>
              <h1 className="text-3xl font-bold">Create Workout Plan</h1>
              <p className="text-blue-100 mt-1">Generate your personalized workout schedule</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {/* Profile Section */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Profile Information
              </h2>
              <Link 
                href="/profile/edit"
                className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                <PencilIcon className="h-4 w-4" />
                <span>Edit</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-item-heading">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  className="form-input bg-gray-100 dark:bg-gray-700"
                  disabled
                />
              </div>
              <div>
                <label className="form-item-heading">Age</label>
                <input
                  type="text"
                  value={formData.age}
                  className="form-input bg-gray-100 dark:bg-gray-700"
                  disabled
                />
              </div>
              <div>
                <label className="form-item-heading">Gender</label>
                <input
                  type="text"
                  value={capitalizeFirstLetter(formData.gender)}
                  className="form-input bg-gray-100 dark:bg-gray-700"
                  disabled
                />
              </div>
              <div>
                <label className="form-item-heading">
                  Height {useMetric ? '(cm)' : '(in)'}
                </label>
                <input
                  type="text"
                  value={formData.height}
                  className="form-input bg-gray-100 dark:bg-gray-700"
                  disabled
                />
              </div>
              <div>
                <label className="form-item-heading">
                  Weight {useMetric ? '(kg)' : '(lbs)'}
                </label>
                <input
                  type="text"
                  value={formData.weight}
                  className="form-input bg-gray-100 dark:bg-gray-700"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Workout Parameters */}
          <div className="space-y-6">
            <div className="form-group">
              <TooltipLabel 
                text="Fitness Goal"
                tooltip="Choose your primary objective for working out"
              />
              <select
                name="fitnessGoal"
                value={formData.fitnessGoal}
                onChange={handleChange}
                className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                required
              >
                <option value="">Select goal</option>
                <option value="weight_loss">Weight Loss</option>
                <option value="muscle_gain">Muscle Gain</option>
                <option value="endurance">Endurance</option>
              </select>
            </div>

            <div className="form-group">
              <TooltipLabel 
                text="Workout Intensity"
                tooltip="How challenging you want your workouts to be. Affects sets and reps."
              />
              <select
                name="intensity"
                value={formData.intensity}
                onChange={handleChange}
                className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                required
              >
                <option value="">Select intensity</option>
                <option value="low">Low - Fewer sets & reps</option>
                <option value="medium">Medium - Standard sets & reps</option>
                <option value="high">High - More sets & reps</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <TooltipLabel 
                  text="Workouts Per Week"
                  tooltip="How many days per week you plan to exercise"
                />
                <select
                  name="workoutsPerWeek"
                  value={formData.workoutsPerWeek}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  required
                >
                  <option value="">Select frequency</option>
                  <option value="2">2 days/week</option>
                  <option value="3">3 days/week</option>
                  <option value="4">4 days/week</option>
                  <option value="5">5 days/week</option>
                  <option value="6">6 days/week</option>
                </select>
              </div>

              <div className="form-group">
                <TooltipLabel 
                  text="Exercises Per Workout"
                  tooltip="Number of different exercises you'll perform in each session"
                />
                <select
                  name="exercisesPerWorkout"
                  value={formData.exercisesPerWorkout}
                  onChange={handleChange}
                  className="form-input w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  required
                >
                  <option value="">Select number</option>
                  <option value="3">3 exercises</option>
                  <option value="4">4 exercises</option>
                  <option value="5">5 exercises</option>
                  <option value="6">6 exercises</option>
                  <option value="7">7 exercises</option>
                  <option value="8">8 exercises</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              type="submit"
              className="w-full btn btn-primary py-3 text-lg font-semibold"
            >
              Generate Workout Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 