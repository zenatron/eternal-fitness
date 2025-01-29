'use client'

import { useState } from 'react'
import FormSection from '@/components/FormSection'
import ScheduleSection from '@/components/ScheduleSection'
import { generateWorkoutSchedule } from '@/services/workoutGenerator'
import type { FormData } from '@/types'

export default function WorkoutForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    fitnessGoal: '',
    intensity: '',
    workoutsPerWeek: '',
    exercisesPerWorkout: ''
  })

  const [workoutSchedule, setWorkoutSchedule] = useState<(string[] | string)[]>([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.workoutsPerWeek || !formData.exercisesPerWorkout) return

    const schedule = generateWorkoutSchedule(
      Number(formData.workoutsPerWeek),
      Number(formData.exercisesPerWorkout)
    )
    setWorkoutSchedule(schedule)
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