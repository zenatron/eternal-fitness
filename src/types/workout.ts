import { MuscleGroup } from '@/lib/muscleGroups';
import { Equipment } from '@/lib/equipment';

export type ExerciseSet = {
  reps: number;
  weight: number;
  unit: 'kg' | 'lbs';
}

export type Exercise = {
  name: string;
  muscles: MuscleGroup[];
  sets?: ExerciseSet[];
  equipment: Equipment[];
};

export type Workout = {
  id: string;
  name: string;
  exercises: Exercise[];
  date?: Date;
  userId?: string;
}

export type ExerciseDatabase = Record<string, Exercise>;

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

export interface SplitDatabase {
  [key: string]: WorkoutSplit
}