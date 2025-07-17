import { Prisma } from '@prisma/client';

// 🚀 REVOLUTIONARY JSON-BASED WORKOUT TYPES

// ============================================================================
// CORE WORKOUT ENUMS
// ============================================================================

export enum WorkoutStatus {
  PLANNED = 'PLANNED',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  IN_PROGRESS = 'IN_PROGRESS',
}

export enum WorkoutType {
  STRENGTH = 'strength',
  CARDIO = 'cardio',
  HYBRID = 'hybrid',
  FLEXIBILITY = 'flexibility',
  SPORTS = 'sports',
}

export enum Difficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum SetType {
  STANDARD = 'standard',
  WARMUP = 'warmup',
  WORKING = 'working',
  DROPSET = 'dropset',
  SUPERSET = 'superset',
  AMRAP = 'amrap', // As Many Reps As Possible
  EMOM = 'emom', // Every Minute On the Minute
  TABATA = 'tabata',
  REST = 'rest',
  // Cardio-specific set types
  CARDIO_INTERVAL = 'cardio_interval',
  CARDIO_STEADY = 'cardio_steady',
  CARDIO_HIIT = 'cardio_hiit',
}

// ============================================================================
// JSON WORKOUT DATA STRUCTURES
// ============================================================================

// 🎯 WORKOUT TEMPLATE JSON STRUCTURE
export interface WorkoutTemplateData {
  metadata: {
    name: string;
    description?: string;
    tags: string[];
    estimatedDuration: number; // minutes
    difficulty: Difficulty;
    workoutType: WorkoutType;
    targetMuscleGroups: string[];
    equipment: string[];
    notes?: string;
  };

  exercises: WorkoutExercise[];

  structure: {
    warmup?: string[]; // exercise IDs
    main: string[]; // exercise IDs
    cooldown?: string[]; // exercise IDs
    circuits?: Circuit[]; // for circuit training
    supersets?: Superset[]; // for superset groupings
  };

  // Progression and adaptation rules
  progression?: {
    type: 'linear' | 'percentage' | 'rpe_based';
    rules: ProgressionRule[];
  };
}

export interface WorkoutExercise {
  id: string; // unique within workout
  exerciseKey: string; // reference to Exercise table
  name: string; // cached for performance
  muscles: string[]; // cached for performance
  equipment: string[]; // cached for performance

  sets: WorkoutSet[];

  // Exercise-specific settings
  instructions?: string;
  videoUrl?: string;
  restBetweenSets?: number; // seconds
  tempo?: string; // e.g., "3-1-2-1" (eccentric-pause-concentric-pause)

  // Advanced settings
  rpeTarget?: number; // Rate of Perceived Exertion (1-10)
  autoRegulation?: boolean; // adjust based on performance
}

export interface WorkoutSet {
  id: string; // unique within exercise
  type: SetType;

  // Strength training targets
  targetReps?: number | { min: number; max: number };
  targetWeight?: number;
  targetRpe?: number; // Rate of Perceived Exertion

  // Cardio targets
  targetDuration?: number; // seconds, for time-based exercises
  targetDistance?: number; // meters, for cardio
  targetCalories?: number; // calories, for cardio
  targetHeartRate?: number; // BPM, for cardio
  targetPace?: number; // seconds per unit distance
  targetIncline?: number; // percentage, for treadmill/bike
  targetResistance?: number; // level, for cardio machines

  // Set relationships
  restTime?: number; // seconds
  supersetGroup?: string; // for grouping superset exercises
  circuitPosition?: number; // position in circuit

  // Notes and instructions
  notes?: string;
  technique?: string; // specific technique notes
}

// ============================================================================
// SUPPORTING STRUCTURES
// ============================================================================

export interface Circuit {
  id: string;
  name: string;
  exercises: string[]; // exercise IDs
  rounds: number;
  restBetweenRounds?: number; // seconds
  restBetweenExercises?: number; // seconds
}

export interface Superset {
  id: string;
  name: string;
  exercises: string[]; // exercise IDs (2+ exercises)
  restBetweenSupersets?: number; // seconds
}

export interface ProgressionRule {
  condition: 'reps_achieved' | 'rpe_below' | 'weeks_completed';
  threshold: number;
  action: 'increase_weight' | 'increase_reps' | 'increase_sets';
  amount: number;
  unit: 'kg' | 'lbs' | 'reps' | 'sets' | 'percentage';
}

// ============================================================================
// WORKOUT SESSION PERFORMANCE DATA
// ============================================================================

// 🎯 WORKOUT SESSION PERFORMANCE JSON STRUCTURE
export interface WorkoutSessionData {
  // Snapshot of template at time of workout (for historical accuracy)
  templateSnapshot: WorkoutTemplateData;

  // Actual performance data
  performance: {
    [exerciseId: string]: ExercisePerformance;
  };

  // Session-level metrics and insights
  metrics: SessionMetrics;

  // Environmental and contextual data
  environment?: EnvironmentData;

  // Session flow and timing
  timeline?: SessionTimeline[];
}

export interface ExercisePerformance {
  exerciseKey: string; // reference to Exercise table
  sets: PerformedSet[];
  exerciseNotes?: string;

  // Exercise-level metrics
  totalVolume: number;
  averageRpe?: number;
  personalRecords?: PersonalRecord[];

  // Performance insights
  performanceRating?: number; // 1-5 scale
  difficultyRating?: number; // compared to expected
}

export interface PerformedSet {
  setId: string; // matches template set ID

  // Strength training performance
  actualReps?: number;
  actualWeight?: number;
  actualRpe?: number; // Rate of Perceived Exertion (1-10)

  // Cardio performance
  actualDuration?: number; // seconds
  actualDistance?: number; // meters
  actualCalories?: number; // calories burned
  actualHeartRate?: number; // average BPM
  actualPace?: number; // seconds per unit distance
  actualIncline?: number; // percentage
  actualResistance?: number; // level

  // Set metadata
  restTime?: number; // actual rest taken
  completed: boolean;
  skipped?: boolean;
  notes?: string;

  // Performance indicators
  failurePoint?: 'form' | 'strength' | 'endurance' | 'time';
  assistanceUsed?: boolean;
  technique?: 'good' | 'fair' | 'poor';
}

export interface SessionMetrics {
  // Volume and intensity
  totalVolume: number;
  totalSets: number;
  totalExercises: number;
  completedSets: number;
  skippedSets: number;

  // Intensity metrics
  averageRpe?: number;
  maxRpe?: number;
  intensityScore?: number; // calculated intensity rating

  // Performance achievements
  personalRecords: PersonalRecord[];
  volumeRecords: VolumeRecord[];

  // Session quality indicators
  adherenceScore: number; // % of planned work completed
  qualityScore?: number; // overall session quality (1-10)
  fatigueLevel?: number; // post-workout fatigue (1-10)
}

// Personal Record types for session metrics
export interface PersonalRecord {
  exerciseKey: string;
  exerciseName: string;
  type: 'weight' | 'reps' | 'volume' | 'duration' | 'distance' | 'calories';
  value: number;
  previousBest?: number;
  improvement: number;
  date: string; // ISO date string
}

export interface VolumeRecord {
  type: 'session' | 'exercise' | 'muscle_group';
  identifier: string; // session, exercise key, or muscle group
  volume: number;
  previousBest?: number;
  improvement: number;
}

export interface EnvironmentData {
  location?: string;
  equipment?: string[];
  weather?: string;
  temperature?: number;
  humidity?: number;
  crowdLevel?: 'empty' | 'light' | 'moderate' | 'busy' | 'packed';
  energyLevel?: number; // 1-10 pre-workout energy
  sleepQuality?: number; // 1-10 previous night's sleep
  stressLevel?: number; // 1-10 current stress level
  nutrition?: {
    preWorkoutMeal?: string;
    hydration?: number; // glasses of water
    supplements?: string[];
  };
}

export interface SessionTimeline {
  timestamp: string; // ISO timestamp
  event: 'start' | 'exercise_start' | 'set_complete' | 'rest_start' | 'rest_end' | 'exercise_end' | 'finish';
  exerciseId?: string;
  setId?: string;
  notes?: string;
}

// ============================================================================
// ACTIVE WORKOUT SESSION TYPES
// ============================================================================

// 🏃‍♂️ ACTIVE WORKOUT SESSION STATE
export interface ActiveWorkoutSessionData {
  // Template information
  templateId: string;
  templateName: string;
  originalTemplate: WorkoutTemplateData;

  // Session timing
  startedAt: Date;
  pausedTime: number; // Total time paused in milliseconds
  isTimerActive: boolean;
  lastPauseTime?: Date;

  // Current workout state
  modifiedTemplate?: WorkoutTemplateData; // Template with user modifications
  performance: { [exerciseId: string]: ExercisePerformance };
  exerciseProgress: { [exerciseId: string]: any };
  sessionNotes: string;

  // Metadata
  version: number; // For handling concurrent updates
  lastUpdated: Date;
}

// 🔄 ACTIVE SESSION UPDATE PAYLOAD
export interface ActiveSessionUpdatePayload {
  performance?: { [exerciseId: string]: ExercisePerformance };
  modifiedTemplate?: WorkoutTemplateData;
  exerciseProgress?: { [exerciseId: string]: any };
  sessionNotes?: string;
  pausedTime?: number;
  isTimerActive?: boolean;
  lastPauseTime?: Date;
}

// ============================================================================
// PRISMA MODEL TYPES (Updated for JSON system)
// ============================================================================

// 🚀 NEW WORKOUT TEMPLATE TYPE (with JSON data)
export type WorkoutTemplate = {
  id: string;
  name: string;
  favorite: boolean;
  createdAt: Date;
  updatedAt: Date;

  // JSON workout data
  workoutData: WorkoutTemplateData;

  // Computed fields (derived from JSON)
  totalVolume: number;
  estimatedDuration: number;
  exerciseCount: number;
  difficulty: string;
  workoutType: string;

  // Relations
  userId: string;
  sessions: WorkoutSession[];
};

// 🚀 NEW WORKOUT SESSION TYPE (with JSON performance data)
export type WorkoutSession = {
  id: string;
  completedAt?: Date | null;
  scheduledAt?: Date | null;
  duration?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // JSON performance data
  performanceData: WorkoutSessionData;

  // Computed metrics (derived from JSON)
  totalVolume: number;
  totalSets: number;
  totalExercises: number;
  personalRecords: number;

  // Relations
  userId: string;
  workoutTemplateId: string;
  workoutTemplate?: WorkoutTemplate;
};

// 🚀 ENHANCED EXERCISE TYPE (simplified reference)
export type Exercise = {
  id: string; // exercise key (e.g., "bench-press")
  name: string;
  description?: string;
  muscles: string[];
  equipment: string[];
  category: string;
  difficulty: string;
  metadata?: any; // JSON metadata
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// ANALYTICS AND STATS TYPES
// ============================================================================

export interface UserAnalyticsData {
  // Strength progression
  strengthProgression: {
    [exerciseKey: string]: {
      maxWeight: number;
      maxVolume: number;
      maxReps: number;
      progression: Array<{
        date: string;
        weight: number;
        reps: number;
        volume: number;
      }>;
    };
  };

  // Volume trends
  volumeTrends: {
    weekly: Array<{ week: string; volume: number }>;
    monthly: Array<{ month: string; volume: number }>;
    byMuscleGroup: { [muscleGroup: string]: number };
    byExercise: { [exerciseKey: string]: number };
  };

  // Performance insights
  performanceInsights: {
    averageSessionDuration: number;
    averageRpe: number;
    consistencyScore: number; // 0-100
    improvementRate: number; // % improvement per month
    favoriteExercises: string[];
    strongestMuscleGroups: string[];
    areasForImprovement: string[];
  };

  // Streaks and achievements
  achievements: {
    currentStreak: number;
    longestStreak: number;
    totalWorkouts: number;
    personalRecords: PersonalRecord[];
    milestones: Array<{
      type: string;
      description: string;
      achievedAt: string;
      value: number;
    }>;
  };
}

export interface MonthlyAnalyticsData {
  // Basic metrics
  workoutsCompleted: number;
  totalVolume: number;
  totalDuration: number;
  averageSessionDuration: number;

  // Exercise breakdown
  exerciseFrequency: { [exerciseKey: string]: number };
  muscleGroupVolume: { [muscleGroup: string]: number };

  // Performance metrics
  averageRpe: number;
  personalRecords: PersonalRecord[];
  volumeRecords: VolumeRecord[];

  // Consistency metrics
  workoutDays: string[]; // ISO date strings
  restDays: number;
  consistencyScore: number;

  // Progression indicators
  strengthGains: { [exerciseKey: string]: number };
  volumeIncrease: number; // % vs previous month
  intensityTrend: 'increasing' | 'stable' | 'decreasing';
}

// ============================================================================
// EXERCISE LIBRARY TYPES
// ============================================================================

export type FormExercise = {
  name: string;
  muscles: string[];
  equipment: string[];
};

export type ExerciseList = {
  [key: string]: FormExercise;
};
