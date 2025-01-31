'use client'

import { useState, useEffect } from 'react'
import FormSection from '@/components/FormSection'
import ScheduleSection from '@/components/ScheduleSection'
import { generateWorkoutSchedule } from '@/services/workoutGenerator'
import type { FormData } from '@/types'
import type { WorkoutDay } from '@/types/exercises'
import { motion } from 'framer-motion'

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

  const [workoutSchedule, setWorkoutSchedule] = useState<(WorkoutDay | 'Rest')[]>([])

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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (workoutSchedule.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [workoutSchedule])

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 py-12 px-4 overflow-hidden"
    >
      <div className="w-full">
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
    </motion.div>
  )
} 