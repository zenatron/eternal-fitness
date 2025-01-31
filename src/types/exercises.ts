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
  name: string
  description: string
  primary: string[]
  secondary: string[]
}

export interface WorkoutSplit {
  name: string
  description: string
  daysPerWeek: number
  pattern: (string | 'rest')[]
  days: Record<string, WorkoutDay>
}

export interface ExerciseDatabase {
  [key: string]: Exercise
}

export interface SplitDatabase {
  [key: string]: WorkoutSplit
}