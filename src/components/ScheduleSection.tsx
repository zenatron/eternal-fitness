'use client'

import { useState } from 'react'
import { FormData } from '@/types'
import { getExerciseDetails, generateWorkoutSchedule, getModifiedExerciseDetails } from '@/services/workoutGenerator'
import type { WorkoutDay } from '@/types/exercises'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDaysIcon, ArrowPathIcon, ArrowLeftIcon, PlusCircleIcon } from '@heroicons/react/24/outline'
import { generateICalendarData, downloadCalendarFile } from '@/utils/calendar'

interface ScheduleSectionProps {
  formData: FormData
  workoutSchedule: (WorkoutDay | 'Rest')[]
  setWorkoutSchedule: React.Dispatch<React.SetStateAction<(WorkoutDay | 'Rest')[]>>
}

export default function ScheduleSection({ formData, workoutSchedule, setWorkoutSchedule }: ScheduleSectionProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null)

  // Function to get all muscles targeted for a given day's exercises
  const getMusclesForDay = (workout: WorkoutDay): string[] => {
    const muscleSet = new Set<string>()
    const allExercises = [...workout.primary, ...workout.secondary]
    
    allExercises.forEach((exercise) => {
      const exerciseData = getExerciseDetails(exercise)
      if (exerciseData?.muscles) {
        exerciseData.muscles.forEach((muscle) => muscleSet.add(muscle))
      }
    })
    return Array.from(muscleSet)
  }

  const handleRegenerateSchedule = () => {
    try {
      setExpandedDay(null)
      const newSchedule = generateWorkoutSchedule(
        Number(formData.workoutsPerWeek),
        Number(formData.exercisesPerWorkout)
      )
      console.log('New Schedule:', newSchedule) // Debug log
      setWorkoutSchedule(newSchedule)
    } catch (error) {
      console.error('Error regenerating schedule:', error)
    }
  }

  const getFormattedDate = (daysFromNow: number) => {
    const date = new Date()
    date.setDate(date.getDate() + daysFromNow + 1)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Function to scroll to a specific day's header
  const scrollToDay = (index: number) => {
    const dayElement = document.getElementById(`workout-day-${index}`)
    if (dayElement) {
      const headerHeight = 64 // Height of the fixed header (4rem)
      const rect = dayElement.getBoundingClientRect()
      const absoluteTop = window.pageYOffset + rect.top - headerHeight - 16 // Subtract header height and add some padding
      window.scrollTo({ top: absoluteTop, behavior: 'smooth' })
    }
  }

  // Modify the click handler to include scrolling
  const handleDayClick = (index: number) => {
    setExpandedDay(expandedDay === index ? null : index)
    if (expandedDay !== index) {
      // Small delay to ensure the content expands before scrolling
      setTimeout(() => scrollToDay(index), 100)
    }
  }

  const handleAddToCalendar = () => {
    const icalData = generateICalendarData(workoutSchedule)
    downloadCalendarFile(icalData)
  }

  const getDisplayName = (workout: WorkoutDay | 'Rest') => {
    if (workout === 'Rest') return 'Rest'
    // Use the name from the splits data
    return workout.name
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-12 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-center gap-6">
            <CalendarDaysIcon className="w-20 h-20" />
            <div>
              <h1 className="text-3xl font-bold">{`${formData.name}'s Workout Plan`}</h1>
              <p className="text-blue-100 mt-1">{"Your personalized weekly schedule"}</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Add Calendar Button */}
          <div className="mb-6">
            <button
              onClick={handleAddToCalendar}
              className="btn btn-secondary inline-flex items-center gap-2"
            >
              <PlusCircleIcon className="w-5 h-5" />
              {"Add to Calendar"}
            </button>
          </div>

          <div className="grid gap-4 mb-8">
            {workoutSchedule.map((workout, index) => {
              const isExpanded = expandedDay === index
              const isWorkoutDay = workout !== 'Rest'
              const musclesTargeted = isWorkoutDay 
                ? getMusclesForDay(workout as WorkoutDay)
                : []

              return (
                <motion.div
                  key={index}
                  id={`workout-day-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`
                    rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden
                    transition-all duration-200
                    ${isWorkoutDay ? 'hover:shadow-lg cursor-pointer' : 'bg-gray-50 dark:bg-gray-800/50'}
                    ${isExpanded ? 'shadow-lg' : ''}
                  `}
                  onClick={() => isWorkoutDay && handleDayClick(index)}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {getFormattedDate(index)}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Day {index + 1} - {isWorkoutDay ? getDisplayName(workout) : 'Rest'}
                        </p>
                      </div>
                      {isWorkoutDay && (
                        <button 
                          className="text-blue-500 hover:text-blue-600 dark:text-blue-400 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDayClick(index)
                          }}
                        >
                          <motion.span
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            className="block text-xl"
                          >
                            ▼
                          </motion.span>
                        </button>
                      )}
                    </div>

                    {!isWorkoutDay && (
                      <div className="mt-4">
                        <div className="p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <svg 
                              className="w-5 h-5 text-blue-600 dark:text-blue-400" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">Rest & Recovery</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Focus on sleep, nutrition, and light stretching
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {isWorkoutDay && !isExpanded && (
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                          {musclesTargeted.map((muscle, i) => (
                            <span 
                              key={i}
                              className="px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full"
                            >
                              {muscle}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <AnimatePresence>
                      {isExpanded && isWorkoutDay && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-6 space-y-4"
                        >
                          {workout.primary.map((exercise, exerciseIndex) => {
                            const details = getExerciseDetails(exercise)
                            const modifiedDetails = getModifiedExerciseDetails(exercise, formData.intensity)

                            return (
                              <div 
                                key={exerciseIndex}
                                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                              >
                                <h4 className="font-medium text-gray-900 dark:text-white text-lg">
                                  {exercise}
                                </h4>
                                <div className="mt-3 grid grid-cols-2 gap-4">
                                  <div className="bg-white dark:bg-gray-700 p-2 rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Sets</p>
                                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                                      {modifiedDetails?.sets.min}-{modifiedDetails?.sets.max}
                                    </p>
                                  </div>
                                  <div className="bg-white dark:bg-gray-700 p-2 rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Reps</p>
                                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                                      {modifiedDetails?.reps.min}-{modifiedDetails?.reps.max}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Targets: {details?.muscles.join(', ')}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => {
                setExpandedDay(null)
                setWorkoutSchedule([])
              }}
              className="btn btn-primary flex-1 inline-flex items-center justify-center gap-2"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              {"Go Back"}
            </button>
            <button
              onClick={handleRegenerateSchedule}
              className="btn btn-secondary flex-1 inline-flex items-center justify-center gap-2"
            >
              <ArrowPathIcon className="w-5 h-5" />
              {"Regenerate Schedule"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
} 