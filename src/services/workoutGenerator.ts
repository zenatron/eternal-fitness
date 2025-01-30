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

export interface WorkoutDay {
  exercises: string[]
  splitName: string
}

function selectExercisesForDay(day: DayPlan, totalExercises: number): string[] {
  // Always include all primary exercises first
  const selectedExercises = [...day.primary]

  // If we need more exercises, randomly select from secondary
  if (totalExercises > day.primary.length) {
    const remainingNeeded = totalExercises - day.primary.length
    const shuffledSecondary = [...day.secondary].sort(() => Math.random() - 0.5)
    selectedExercises.push(...shuffledSecondary.slice(0, remainingNeeded))
  }

  return selectedExercises
}

export function generateWorkoutSchedule(
  workoutsPerWeek: number, 
  exercisesPerWorkout: number
): (WorkoutDay | 'Rest')[] {
  const splitKey = getSplitForWorkoutCount(workoutsPerWeek)
  const split = splits[splitKey]
  
  if (!split) {
    throw new Error('Invalid workout count')
  }

  const pattern = split.pattern.slice(0, 7)
  
  return pattern.map(dayType => {
    if (dayType === 'rest') return 'Rest'

    const day = split.days[dayType]
    return {
      splitName: dayType,
      exercises: selectExercisesForDay(day, exercisesPerWorkout)
    }
  })
}

function getSplitForWorkoutCount(workoutsPerWeek: number): string {
  switch (workoutsPerWeek) {
    case 2:
      return 'TwoDay'
    case 3:
      return 'ThreeDay'
    case 4:
      return 'FourDay'
    case 5:
      return 'FiveDay'
    case 6:
      return 'SixDay'
    default:
      return 'ThreeDay' // Default to 3-day split if invalid count
  }
}

export function getExerciseDetails(exerciseName: string): Exercise | undefined {
  return exercises[exerciseName]
}

interface ModifiedExerciseDetails {
  sets: { min: number; max: number }
  reps: { min: number; max: number }
}

export function getModifiedExerciseDetails(
  exerciseName: string,
  intensity: string
): ModifiedExerciseDetails | undefined {
  const baseExercise = exercises[exerciseName]
  if (!baseExercise) return undefined

  switch (intensity) {
    case 'low':
      return {
        sets: {
          min: Math.max(1, baseExercise.sets.min - 1),
          max: Math.max(1, baseExercise.sets.max - 1)
        },
        reps: {
          min: Math.floor(baseExercise.reps.min * 0.75),
          max: Math.floor(baseExercise.reps.max * 0.75)
        }
      }
    case 'high':
      return {
        sets: {
          min: baseExercise.sets.min + 1,
          max: baseExercise.sets.max + 1
        },
        reps: {
          min: Math.ceil(baseExercise.reps.min * 1.25),
          max: Math.ceil(baseExercise.reps.max * 1.25)
        }
      }
    default: // medium intensity
      return {
        sets: { ...baseExercise.sets },
        reps: { ...baseExercise.reps }
      }
  }
}