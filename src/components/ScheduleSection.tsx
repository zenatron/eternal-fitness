'use client'

import { FormData } from '@/types'
import { getExerciseDetails, generateWorkoutSchedule } from '@/services/workoutGenerator'

interface ScheduleSectionProps {
  formData: FormData
  workoutSchedule: (string[] | string)[]
  setWorkoutSchedule: React.Dispatch<React.SetStateAction<(string[] | string)[]>>
}

export default function ScheduleSection({ formData, workoutSchedule, setWorkoutSchedule }: ScheduleSectionProps) {
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
    // Use the legacy function for now
    const newSchedule = generateWorkoutSchedule(
      Number(formData.workoutsPerWeek),
      Number(formData.exercisesPerWorkout)
    )
    setWorkoutSchedule(newSchedule)
  }

  return (
    <div className="w-full max-w-lg">
      <div className="bg-white dark:bg-gray-900 shadow-md rounded px-8 pt-6 pb-8 w-full max-w-lg">
        <h2 className="text-xl font-bold text-center mb-4 m-auto w-fit gradient-text-blue">
          {formData.name}&#39;s Weekly Workout Schedule
        </h2>
        {workoutSchedule.map((workout, index) => {
          const today = new Date()
          const workoutDate = new Date(today)
          workoutDate.setDate(today.getDate() + index + 1) // Start with tomorrow

          const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
          const formattedDate = workoutDate.toLocaleDateString('en-US', options)

          const musclesTargeted = Array.isArray(workout) ? getMusclesForDay(workout) : []

          return (
            <div key={index} className="border-b last:border-b-0 pb-4 mt-4 flex justify-between">
              {/* Day Title and Exercises */}
              <div>
                <h4 className="text-md font-medium text-gray-400">Day {index + 1}</h4>
                <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">{formattedDate}</h3>
                <ul className="list-disc ml-5 space-y-1">
                  {Array.isArray(workout) ? (
                    workout.map((exercise, exerciseIndex) => (
                      <li key={exerciseIndex} className="text-gray-700 dark:text-gray-300">
                        {exercise}
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500 dark:text-gray-400 italic">{workout}</li>
                  )}
                </ul>
              </div>
              {/* Muscles Targeted */}
              <div className="ml-6 text-sm text-gray-500">
                {Array.isArray(workout) ? (
                  <div>
                    <h4 className="text-base font-semibold mb-1 text-gray-500 dark:text-gray-400">
                      Muscles Targeted:
                    </h4>
                    <ul className="list-disc ml-4 space-y-1 text-gray-500 dark:text-gray-400">
                      {musclesTargeted.map((muscle, muscleIndex) => (
                        <li key={muscleIndex}>{muscle}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-base italic font-semibold text-gray-500 dark:text-gray-400">
                    Enjoy your rest day!
                  </p>
                )}
              </div>
            </div>
          )
        })}
        <div className="mt-6 flex flex-col space-y-4">
          <button
            onClick={handleRegenerateSchedule}
            className="btn btn-tertiary w-full"
          >
            Regenerate Schedule
          </button>
          <button
            onClick={() => setWorkoutSchedule([])}
            className="btn btn-primary w-full"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
} 