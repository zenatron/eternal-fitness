import { exercises } from '@/data/exercises'
import { splits } from '@/data/splits'
import type { Exercise, Split, DayPlan } from '@/types/exercises'

export class WorkoutGenerator {
  private readonly exercises: Record<string, Exercise>
  private readonly splits: Record<string, Split>

  constructor(exercises: Record<string, Exercise>, splits: Record<string, Split>) {
    this.exercises = exercises
    this.splits = splits
  }

  private generateDayWorkout(day: DayPlan, exerciseCount: number): string[] {
    const workout: string[] = []
    
    // Always include primary exercises first
    workout.push(...day.primary.slice(0, exerciseCount))
    
    // If we need more exercises, randomly select from secondary
    if (workout.length < exerciseCount) {
      const remainingCount = exerciseCount - workout.length
      const shuffledSecondary = [...day.secondary].sort(() => Math.random() - 0.5)
      workout.push(...shuffledSecondary.slice(0, remainingCount))
    }

    return workout
  }

  public generateWeeklySchedule(
    splitName: string,
    exercisesPerWorkout: number
  ): (string[] | 'rest')[] {
    const split = this.splits[splitName]
    if (!split) throw new Error(`Split "${splitName}" not found`)

    return split.pattern.map(dayType => {
      if (dayType === 'rest') return 'rest'
      
      const day = split.days[dayType]
      if (!day) throw new Error(`Day "${dayType}" not found in split "${splitName}"`)
      
      return this.generateDayWorkout(day, exercisesPerWorkout)
    })
  }

  public getExerciseDetails(exerciseName: string): Exercise | undefined {
    return this.exercises[exerciseName]
  }

  public getSplitDetails(splitName: string): Split | undefined {
    return this.splits[splitName]
  }
}

export function generateWorkoutSchedule(workoutsPerWeek: number, exercisesPerWorkout: number): (string[] | string)[] {
  // Get a random split based on number of workouts
  const splitKey = getSplitForWorkoutCount(workoutsPerWeek)
  const split = splits[splitKey]
  
  if (!split) {
    throw new Error(`No split found for ${workoutsPerWeek} workouts per week`)
  }

  // Get the pattern for the selected split
  const pattern = split.pattern.slice(0, 7) // Ensure we only take a week's worth
  
  // Convert pattern to actual workouts
  return pattern.map(dayType => {
    if (dayType === 'rest') return 'Rest'
    
    const day = split.days[dayType]
    if (!day) {
      throw new Error(`Day type "${dayType}" not found in split`)
    }
    return selectExercisesForDay(day, exercisesPerWorkout)
  })
}

function getSplitForWorkoutCount(workoutsPerWeek: number): string {
  const splitMap: Record<number, string[]> = {
    2: ['TwoDay'],
    3: ['ThreeDay'],
    4: ['FourDay'],
    5: ['FiveDay'],
    6: ['SixDay']
  }

  const possibleSplits = splitMap[workoutsPerWeek] || ['ThreeDay']
  return possibleSplits[Math.floor(Math.random() * possibleSplits.length)]
}

function selectExercisesForDay(day: DayPlan, count: number): string[] {
  // Combine primary and secondary exercises
  const allExercises = [...day.primary, ...day.secondary]
  
  // Randomly select the requested number of exercises
  const selected: string[] = []
  while (selected.length < count && allExercises.length > 0) {
    const index = Math.floor(Math.random() * allExercises.length)
    selected.push(allExercises[index])
    allExercises.splice(index, 1)
  }
  
  return selected
}

export function getExerciseDetails(exerciseName: string): Exercise | undefined {
  return exercises[exerciseName]
} 