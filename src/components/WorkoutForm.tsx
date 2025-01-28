'use client'

import { useState } from 'react'
import FormSection from '@/components/FormSection'
import ScheduleSection from '@/components/ScheduleSection'
import { generateWorkoutSchedule } from '@/lib/workoutGenerator'
import type { FormData } from '@/types'
import type { User } from '@supabase/auth-helpers-nextjs'

export default function WorkoutForm({ user }: { user: User }) {
  const [formData, setFormData] = useState<FormData>({
    name: user?.user_metadata?.name || '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    fitnessGoal: '',
    intensity: '',
    exercisesPerWorkout: '',
    workoutsPerWeek: '',
  })

  const [workoutSchedule, setWorkoutSchedule] = useState<(string[] | string)[]>([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.workoutsPerWeek || !formData.exercisesPerWorkout) return

    const schedule = generateWorkoutSchedule(
      Number(formData.workoutsPerWeek),
      Number(formData.exercisesPerWorkout)
    )
    setWorkoutSchedule(schedule || [])
  }

  return (
    <div className="flex items-center justify-center py-8">
      {workoutSchedule.length === 0 ? (
        <FormSection
          formData={formData}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          setFormData={setFormData}
        />
      ) : (
        <ScheduleSection
          formData={formData}
          workoutSchedule={workoutSchedule}
          setWorkoutSchedule={setWorkoutSchedule}
        />
      )}
    </div>
  )
} 