export interface User {
  email: string
  name: string
}

export interface FormData {
  name: string
  age: string
  gender: string
  height: string
  weight: string
  fitnessGoal: string
  intensity: string
  exercisesPerWorkout: string
  workoutsPerWeek: string
}

export interface Exercise {
  muscles: string[]
}

export interface DayPlan {
  primary: string[]
  secondary: string[]
}

export interface ExerciseDict {
  [key: string]: Exercise
}

export interface DayExercises {
  [key: string]: DayPlan
}

export interface SplitVariation {
  [key: string]: string[]
} 