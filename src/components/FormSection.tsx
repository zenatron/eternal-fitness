'use client'

import { FormData } from '@/types'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'

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
    <div className="w-full max-w-lg">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 shadow-md rounded px-8 pt-6 pb-8">
        <h2 className="text-2xl font-bold text-center mb-4 gradient-text-blue mx-auto">
          Create Your Workout Plan
        </h2>

        {/* Profile Information */}
        <div className="space-y-4 mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Profile Information
          </h2>
          <div className="grid grid-cols-2 gap-6">
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
              <label className="form-item-heading">Height</label>
              <input
                type="text"
                value={formData.height}
                className="form-input bg-gray-100 dark:bg-gray-700"
                disabled
              />
            </div>
            <div>
              <label className="form-item-heading">Weight</label>
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
              className="form-input"
              required
            >
              <option value="">Select goal</option>
              <option value="weight_loss">Weight Loss</option>
              <option value="muscle_gain">Muscle Gain</option>
              <option value="endurance">Endurance</option>
              <option value="general_fitness">General Fitness</option>
            </select>
          </div>

          <div className="form-group">
            <TooltipLabel 
              text="Intensity Level"
              tooltip="Choose based on your current fitness level and experience"
            />
            <select
              name="intensity"
              value={formData.intensity}
              onChange={handleChange}
              className="form-input"
              required
            >
              <option value="">Select intensity</option>
              <option value="low">Low - Beginner Friendly</option>
              <option value="medium">Medium - Some Experience</option>
              <option value="high">High - Advanced</option>
            </select>
          </div>

          <div className="form-group">
            <TooltipLabel 
              text="Workouts Per Week"
              tooltip="How many days per week you plan to exercise"
            />
            <select
              name="workoutsPerWeek"
              value={formData.workoutsPerWeek}
              onChange={handleChange}
              className="form-input"
              required
            >
              <option value="">Select number</option>
              <option value="3">3 days</option>
              <option value="4">4 days</option>
              <option value="5">5 days</option>
              <option value="6">6 days</option>
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
              className="form-input"
              required
            >
              <option value="">Select number</option>
              <option value="3">3 exercises</option>
              <option value="4">4 exercises</option>
              <option value="5">5 exercises</option>
              <option value="6">6 exercises</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <button type="submit" className="btn btn-primary w-full mt-8">
          Generate Workout Schedule
        </button>
      </form>
    </div>
  )
} 