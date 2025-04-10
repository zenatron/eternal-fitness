// Define the WorkoutStatus enum to match Prisma schema
export enum WorkoutStatus {
  PLANNED = 'PLANNED',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  IN_PROGRESS = 'IN_PROGRESS'
}

// Represents an exercise within a set
export type Exercise = {
  id: string;
  name: string;
  description?: string;
  muscles: string[];
  equipment: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
  // Added sets for potential bidirectional reference if needed, but primarily defined on Set
  sets?: Set[];
};

// Represents a set within a workout template
export type Set = {
  id: string;
  // Link to WorkoutTemplate ID
  workoutTemplateId: string;
  exercises: Exercise[]; // Usually just one exercise per set in this structure
  reps: number;
  weight: number;
  duration?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  volume?: number; // Calculated volume for this set
  // workoutTemplate?: WorkoutTemplate; // Optional back-reference
};

// Renamed from Workout - Matches database WorkoutTemplate model
export type WorkoutTemplate = {
  id: string;
  name: string;
  favorite: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  totalVolume: number; // Represents the typical volume of this template
  userId: string;
  sets: Set[];

  // Removed: description, scheduledDate, completed, completedAt, status, duration, notes (notes are now session-specific)
};

// New type for Workout Session - Matches database WorkoutSession model
export type WorkoutSession = {
  id: string;
  completedAt?: string | Date | null; // When the workout was actually completed (can be null for scheduled sessions)
  scheduledAt?: string | Date; // For scheduled sessions
  duration?: number;      // Optional: Actual duration of this specific session in minutes
  notes?: string;         // Optional: Notes specific to this session
  totalVolume: number;     // Calculated volume for this specific session
  userId: string;
  workoutTemplateId: string;
  // Include template details if needed when fetching sessions
  workoutTemplate?: { name: string; id?: string } | null;
};

// Represents the structure expected by the WorkoutFormEditor component
// (Kept separate as form state might differ slightly from DB model)
export type FormExercise = {
  name: string;
  muscles: string[];
  equipment: string[];
};

// Represents a list of all possible exercises
export type ExerciseList = {
  [key: string]: FormExercise;
};