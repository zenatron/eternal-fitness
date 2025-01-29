export type MuscleGroup = 
  | 'Chest' | 'Upper Chest'
  | 'Back' | 'Upper Back' | 'Lower Back' | 'Lats'
  | 'Shoulders' | 'Front Deltoids' | 'Side Deltoids' | 'Rear Deltoids'
  | 'Biceps' | 'Triceps' | 'Forearms'
  | 'Quadriceps' | 'Hamstrings' | 'Calves'
  | 'Glutes' | 'Core' | 'Hip Flexors'
  | 'Rotator Cuff' | 'Traps'

export type Equipment = 
  | 'Barbell' | 'Dumbbells' | 'Kettlebell'
  | 'Cable Machine' | 'Machine'
  | 'Pull-up Bar' | 'Dip Bars'
  | 'Bench' | 'Incline Bench' | 'Preacher Bench'
  | 'Squat Rack' | 'T-Bar Machine'
  | 'Box' | 'Bar' | 'Resistance Band'
  | 'Body Weight'

export type Category = 'compound' | 'isolation'

export interface Exercise {
  name: string
  muscles: MuscleGroup[]
  sets: { min: number; max: number }
  reps: { min: number; max: number }
  category: Category
  equipment: Equipment[]
}

export interface WorkoutDay {
  name: string                    // e.g., "Push Day", "Leg Day"
  primary: string[]              // Array of exercise names (ordered)
  secondary: string[]            // Array of exercise names (can be random)
  description?: string           // Optional description of the day's focus
}

export interface WorkoutSplit {
  name: string                   // e.g., "PPL", "Upper/Lower"
  description: string
  daysPerWeek: number
  pattern: (string | 'rest')[]   // e.g., ['push', 'pull', 'legs', 'rest', 'push', 'pull', 'legs']
  days: Record<string, WorkoutDay> // e.g., { push: WorkoutDay, pull: WorkoutDay, legs: WorkoutDay }
}

export interface ExerciseDatabase {
  [key: string]: Exercise
}

export interface DayPlan {
  name: string
  description: string
  primary: string[]
  secondary: string[]
}

export interface Split {
  name: string
  description: string
  daysPerWeek: number
  pattern: (string | 'rest')[]
  days: {
    [key: string]: DayPlan
  }
}

export interface SplitDatabase {
  [key: string]: Split
} 