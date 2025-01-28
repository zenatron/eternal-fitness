'use client'

import { FormData } from '@/types'
import { useEffect } from 'react'
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
    <div className="flex items-center gap-1.5 mb-1 group">
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
  useEffect(() => {
    async function loadProfileData() {
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
          name: profile.name,
          age: profile.age.toString(),
          gender: profile.gender,
          height: profile.height.toString(),
          weight: profile.weight.toString(),
        }))
      }
    }

    loadProfileData()
  }, [setFormData])

  return (
    <div className="bg-white dark:bg-gray-900 shadow-md rounded px-8 pt-6 pb-8 w-full max-w-lg">
      <h1 className="text-2xl font-bold text-center mb-2 gradient-text-apple m-auto">Eternal Fitness</h1>
      <h3 className="text-sm text-center mb-4 dark:text-white">Complete your Fitness Profile and click Submit to generate your Workout Schedule</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Read-only profile information */}
        <div className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Profile Information</h2>
          <div className="grid grid-cols-2 gap-4">
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
                value={formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1)}
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

        {/* Workout specific questions */}
        <div>
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

        <div>
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

        <div>
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
            {[4, 5, 6, 7, 8].map(num => (
              <option key={num} value={num.toString()}>{num}</option>
            ))}
          </select>
        </div>

        <div>
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
            {[2, 3, 4, 5, 6].map(num => (
              <option key={num} value={num.toString()}>{num}</option>
            ))}
          </select>
        </div>

        {/* Submit Button */}
        <div className="flex justify-between items-center mt-4">
          <button 
            type="submit"
            onClick={handleSubmit}
            className="btn btn-primary w-full"
          >
            Generate Workout
          </button>
        </div>
      </form>
    </div>
  )
} 