

// Define the WorkoutStatus enum to match Prisma schema
export enum WorkoutStatus {
  PLANNED = 'PLANNED',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  IN_PROGRESS = 'IN_PROGRESS'
}

// Matches database Exercise model
export type Exercise = {
  id: string;
  name: string;
  description?: string;
  muscles: string[];
  equipment: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
  sets?: Set[];
};

// Matches database Set model
export type Set = {
  id: string;
  workoutId: string;
  reps: number;
  weight: number;
  duration?: number;
  volume?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  exercises: Exercise[];
};

// Matches database Workout model
export type Workout = {
  id: string;
  name: string;
  description?: string;
  duration?: number;
  scheduledDate?: string | Date;
  completed: boolean;
  completedAt?: string | Date;
  notes?: string;
  favorite: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  totalVolume: number;
  status: WorkoutStatus;
  userId: string;
  sets: Set[];
};

