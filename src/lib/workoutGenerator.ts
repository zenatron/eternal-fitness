import { exerciseDict } from '@/data/exercises'

export function generateWorkoutSchedule(workoutsPerWeek: number, exercisesPerWorkout: number): (string[] | string)[] {
  // Validate inputs
  if (!workoutsPerWeek || !exercisesPerWorkout) return []
  
  const schedule: (string[] | string)[] = []
  const exercises = Object.keys(exerciseDict)
  const daysInWeek = 7
  
  // Create array of workout days and rest days
  for (let i = 0; i < daysInWeek; i++) {
    if (schedule.length < workoutsPerWeek) {
      // Generate workout for this day
      const dailyExercises: string[] = []
      const usedExercises = new Set<string>()
      
      // Add random exercises, avoiding duplicates
      while (dailyExercises.length < exercisesPerWorkout) {
        const randomExercise = exercises[Math.floor(Math.random() * exercises.length)]
        if (!usedExercises.has(randomExercise)) {
          dailyExercises.push(randomExercise)
          usedExercises.add(randomExercise)
        }
      }
      
      schedule.push(dailyExercises)
    } else {
      // Add rest day
      schedule.push('Rest Day')
    }
  }
  
  return schedule
} 