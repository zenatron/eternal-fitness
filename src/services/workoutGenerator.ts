// import { exercises } from '@/lib/exercises'
// import { splits } from '@/lib/splits'
// import type { Exercise, WorkoutSplit, WorkoutDay, ExerciseSet } from '@/types/workout'

// export class WorkoutGenerator {
//   private readonly exercises: Record<string, Exercise>
//   private readonly splits: Record<string, WorkoutSplit>

//   constructor(exercises: Record<string, Exercise>, splits: Record<string, WorkoutSplit>) {
//     this.exercises = exercises
//     this.splits = splits
//   }

//   private generateDayWorkout(day: WorkoutDay, exerciseCount: number): string[] {
//     const workout: string[] = []
    
//     // Always include primary exercises first
//     workout.push(...day.primary.slice(0, exerciseCount))
    
//     // If we need more exercises, randomly select from secondary
//     if (workout.length < exerciseCount) {
//       const remainingCount = exerciseCount - workout.length
//       const shuffledSecondary = [...day.secondary].sort(() => Math.random() - 0.5)
//       workout.push(...shuffledSecondary.slice(0, remainingCount))
//     }

//     return workout
//   }

//   public generateWeeklySchedule(
//     splitName: string,
//     exercisesPerWorkout: number
//   ): (string[] | 'rest')[] {
//     const split = this.splits[splitName]
//     if (!split) throw new Error(`Split "${splitName}" not found`)

//     return split.pattern.map(dayType => {
//       if (dayType === 'rest') return 'rest'
      
//       const day = split.days[dayType]
//       if (!day) throw new Error(`Day "${dayType}" not found in split "${splitName}"`)
      
//       return this.generateDayWorkout(day, exercisesPerWorkout)
//     })
//   }

//   public getExerciseDetails(exerciseName: string): Exercise | undefined {
//     return this.exercises[exerciseName]
//   }

//   public getSplitDetails(splitName: string): WorkoutSplit | undefined {
//     return this.splits[splitName]
//   }
// }

// function selectExercisesForDay(day: WorkoutDay, totalExercises: number): string[] {
//   // Always include all primary exercises first
//   const selectedExercises = [...day.primary]

//   // If we need more exercises, randomly select from secondary
//   if (totalExercises > day.primary.length) {
//     const remainingNeeded = totalExercises - day.primary.length
//     const shuffledSecondary = [...day.secondary].sort(() => Math.random() - 0.5)
//     selectedExercises.push(...shuffledSecondary.slice(0, remainingNeeded))
//   }

//   return selectedExercises
// }

// export function generateWorkoutSchedule(
//   workoutsPerWeek: number, 
//   exercisesPerWorkout: number
// ): (WorkoutDay | 'Rest')[] {
//   // Add validation at the start
//   if (workoutsPerWeek < 2 || workoutsPerWeek > 6) {
//     throw new Error('Invalid workout count')
//   }

//   const splitKey = getSplitForWorkoutCount(workoutsPerWeek)
//   const split = splits[splitKey]
  
//   const pattern = split.pattern.slice(0, 7)
  
//   return pattern.map(dayType => {
//     if (dayType === 'rest') return 'Rest'

//     const day = split.days[dayType]
//     return {
//       name: day.name,
//       description: day.description,
//       primary: selectExercisesForDay(day, exercisesPerWorkout),
//       secondary: []
//     }
//   })
// }

// function getSplitForWorkoutCount(workoutsPerWeek: number): string {
//   switch (workoutsPerWeek) {
//     case 2:
//       return 'TwoDay'
//     case 3:
//       return 'ThreeDay'
//     case 4:
//       return 'FourDay'
//     case 5:
//       return 'FiveDay'
//     case 6:
//       return 'SixDay'
//     default:
//       return 'ThreeDay' // Default to 3-day split if invalid count
//   }
// }

// export function getExerciseDetails(exerciseName: string): Exercise | undefined {
//   return exercises[exerciseName]
// }

// // Updated to work with the new type schema
// interface RecommendedExerciseSets {
//   recommendedSets: number;
//   recommendedReps: number;
// }

// export function getExerciseRecommendations(
//   exerciseName: string,
//   intensity: string
// ): RecommendedExerciseSets | undefined {
//   const baseExercise = exercises[exerciseName]
//   if (!baseExercise) return undefined

//   // Default recommended values for exercises
//   const defaultValues = {
//     low: { sets: 3, reps: 8 },
//     medium: { sets: 4, reps: 10 },
//     high: { sets: 5, reps: 12 }
//   }

//   switch (intensity) {
//     case 'low':
//       return {
//         recommendedSets: defaultValues.low.sets,
//         recommendedReps: defaultValues.low.reps
//       }
//     case 'high':
//       return {
//         recommendedSets: defaultValues.high.sets,
//         recommendedReps: defaultValues.high.reps
//       }
//     default: // medium intensity
//       return {
//         recommendedSets: defaultValues.medium.sets,
//         recommendedReps: defaultValues.medium.reps
//       }
//   }
// }