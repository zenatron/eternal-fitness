import { Prisma } from '@prisma/client';

// Define the WorkoutStatus enum to match Prisma schema
export enum WorkoutStatus {
  PLANNED = 'PLANNED',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  IN_PROGRESS = 'IN_PROGRESS',
}

export type WorkoutTemplate = {
  id: string;
  name: string;
  favorite: boolean;
  totalVolume: number;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  userId: string;
  sessions: WorkoutSession[];
  sets: Set[];
};

export type WorkoutTemplateWithSets = Prisma.WorkoutTemplateGetPayload<{
  include: {
    sets: {
      include: { exercise: true };
    };
  };
}>;

export type WorkoutSession = {
  id: string;
  completedAt?: Date | null;
  scheduledAt?: Date;
  duration?: number;
  notes?: string;
  totalVolume: number;

  // Relations
  userId: string;
  workoutTemplateId: string;
};

// Represents an exercise within a set
export type Exercise = {
  id: string;
  name: string;
  description?: string;
  muscles: string[];
  equipment: string[];
  createdAt: Date;
  updatedAt: Date;
};

// Represents a set within a workout template
export type Set = {
  id: string;
  reps: number;
  weight: number;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
  volume?: number;

  // Relations
  workoutTemplateId: string;
  exerciseId: string;
};

// TODO: probably not needed
// Represents the structure expected by the WorkoutFormEditor component
// (Kept separate as form state might differ slightly from DB model)
export type FormExercise = {
  name: string;
  muscles: string[];
  equipment: string[];
};

// TODO: probably better way to do this
// Represents a list of all possible exercises
export type ExerciseList = {
  [key: string]: FormExercise;
};
