'use client'

import { useState } from 'react'
import { FormData } from '@/types'
import { getExerciseDetails, generateWorkoutSchedule, WorkoutDay, getModifiedExerciseDetails } from '@/services/workoutGenerator'
import { motion, AnimatePresence } from 'framer-motion'

interface ScheduleSectionProps {
  formData: FormData
  workoutSchedule: (WorkoutDay | 'Rest')[]
  setWorkoutSchedule: React.Dispatch<React.SetStateAction<(WorkoutDay | 'Rest')[]>>
}

export default function ScheduleSection({ formData, workoutSchedule, setWorkoutSchedule }: ScheduleSectionProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null)

  // Function to get all muscles targeted for a given day's exercises
  const getMusclesForDay = (exercises: string[]): string[] => {
    const muscleSet = new Set<string>()
    exercises.forEach((exercise) => {
      const exerciseData = getExerciseDetails(exercise)
      if (exerciseData?.muscles) {
        exerciseData.muscles.forEach((muscle) => muscleSet.add(muscle))
      }
    })
    return Array.from(muscleSet)
  }

  const handleRegenerateSchedule = () => {
    setExpandedDay(null)
    const newSchedule = generateWorkoutSchedule(
      Number(formData.workoutsPerWeek),
      Number(formData.exercisesPerWorkout)
    )
    setWorkoutSchedule(newSchedule)
  }

  const getFormattedDate = (daysFromNow: number) => {
    const date = new Date()
    date.setDate(date.getDate() + daysFromNow + 1)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="w-full max-w-4xl px-4">
      <div className="bg-white dark:bg-gray-900 shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-bold text-center mb-6 gradient-text-blue m-auto">
          {formData.name}&#39;s Weekly Workout Schedule
        </h2>
        
        <div className="grid gap-4 mb-6">
          {workoutSchedule.map((workout, index) => {
            const isExpanded = expandedDay === index
            const isWorkoutDay = workout !== 'Rest'
            const musclesTargeted = isWorkoutDay 
              ? getMusclesForDay((workout as WorkoutDay).exercises) 
              : []
            
            return (
              <div
                key={index}
                className={`
                  rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden
                  transition-shadow duration-200
                  ${isWorkoutDay ? 'hover:shadow-lg cursor-pointer' : 'bg-gray-50 dark:bg-gray-800'}
                `}
                onClick={() => isWorkoutDay && setExpandedDay(isExpanded ? null : index)}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {getFormattedDate(index)}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Day {index + 1} - {isWorkoutDay ? (workout as WorkoutDay).splitName : 'Rest'}
                      </p>
                    </div>
                    {isWorkoutDay && (
                      <button 
                        className="text-blue-500 hover:text-blue-600 dark:text-blue-400"
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedDay(isExpanded ? null : index)
                        }}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    )}
                  </div>

                  {!isWorkoutDay && (
                    <p className="mt-2 text-gray-500 dark:text-gray-400 italic">
                      Rest Day - Recovery & Growth
                    </p>
                  )}

                  {isWorkoutDay && !isExpanded && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Muscles: {musclesTargeted.join(', ')}
                      </p>
                    </div>
                  )}

                  <AnimatePresence>
                    {isExpanded && isWorkoutDay && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 space-y-4"
                      >
                        {(workout as WorkoutDay).exercises.map((exercise, exerciseIndex) => {
                          const details = getExerciseDetails(exercise)
                          const modifiedDetails = getModifiedExerciseDetails(exercise, formData.intensity)
                          
                          return (
                            <div 
                              key={exerciseIndex}
                              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md"
                            >
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {exercise}
                              </h4>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                <p className="text-gray-600 dark:text-gray-300">
                                  Sets: {modifiedDetails?.sets.min}-{modifiedDetails?.sets.max}
                                </p>
                                <p className="text-gray-600 dark:text-gray-300">
                                  Reps: {modifiedDetails?.reps.min}-{modifiedDetails?.reps.max}
                                </p>
                              </div>
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Targets: {details?.muscles.join(', ')}
                              </p>
                            </div>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleRegenerateSchedule}
            className="btn btn-tertiary flex-1"
          >
            Regenerate Schedule
          </button>
          <button
            onClick={() => {
              setExpandedDay(null)
              setWorkoutSchedule([])
            }}
            className="btn btn-primary flex-1"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
} 