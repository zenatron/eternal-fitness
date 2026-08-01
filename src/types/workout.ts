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

export const WorkoutType = {
  STRENGTH: 'strength',
  CARDIO: 'cardio',
  HYBRID: 'hybrid',
  FLEXIBILITY: 'flexibility',
  SPORTS: 'sports',
} as const;
export type WorkoutType = (typeof WorkoutType)[keyof typeof WorkoutType];

export const Difficulty = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const SetType = {
  STANDARD: 'standard',
  WARMUP: 'warmup',
  WORKING: 'working',
  DROPSET: 'dropset',
  SUPERSET: 'superset',
  AMRAP: 'amrap', // As Many Reps As Possible
  EMOM: 'emom', // Every Minute On the Minute
  TABATA: 'tabata',
  REST: 'rest',
} as const;
export type SetType = (typeof SetType)[keyof typeof SetType];

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

  /**
   * The logged weight is per limb, not the total load moved — true for dumbbell
   * work (the number is one dumbbell) and for unilateral movements (one side at
   * a time, reps logged per side). Volume counts it twice; see lib/volume.ts.
   * Defaulted from the exercise library and overridable per template.
   */
  perSide?: boolean;

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

  // Targets (what the workout prescribes)
  targetReps?: number | { min: number; max: number };
  targetWeight?: number;
  targetDuration?: number; // seconds, for time-based exercises
  targetDistance?: number; // meters, for cardio
  targetRpe?: number; // Rate of Perceived Exertion

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

  /**
   * Snapshot of the exercise's per-side setting at the time this was logged.
   * Stored on the session rather than read from the template, so editing a
   * template later cannot retroactively change what a past workout meant.
   */
  perSide?: boolean;

  // Exercise-level metrics
  totalVolume: number;
  averageRpe?: number;
  personalRecords?: LegacyPersonalRecord[];

  // Performance insights
  performanceRating?: number; // 1-5 scale
  difficultyRating?: number; // compared to expected
}

export interface PerformedSet {
  setId: string; // matches template set ID

  // Actual performance
  actualReps?: number;
  actualWeight?: number;
  actualDuration?: number; // seconds
  actualDistance?: number; // meters
  actualRpe?: number; // Rate of Perceived Exertion (1-10)

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
  personalRecords: LegacyPersonalRecord[];
  volumeRecords: LegacyVolumeRecord[];

  // Session quality indicators
  adherenceScore: number; // % of planned work completed
  qualityScore?: number; // overall session quality (1-10)
  fatigueLevel?: number; // post-workout fatigue (1-10)
}

// Legacy PR types for session metrics (deprecated - use personalRecords.ts types instead)
export interface LegacyPersonalRecord {
  exerciseKey: string;
  exerciseName: string;
  type: 'weight' | 'reps' | 'volume' | 'duration' | 'distance';
  value: number;
  previousBest?: number;
  improvement: number;
  date: string; // ISO date string
}

export interface LegacyVolumeRecord {
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
  /**
   * @deprecated Ambiguous and double-counted across pause/resume cycles. Kept so
   * sessions written by older builds still load; use `accumulatedSeconds`.
   */
  pausedTime: number;
  isTimerActive: boolean;
  /** Date in memory; an ISO string once it has round-tripped through JSON. */
  lastPauseTime?: Date | string;

  /** Seconds of active training accumulated in already-finished segments. */
  accumulatedSeconds?: number;
  /** Start of the currently running segment. Absent while paused. */
  segmentStartedAt?: Date | string;

  // Current workout state
  modifiedTemplate?: WorkoutTemplateData; // Template with user modifications
  performance: { [exerciseId: string]: ExercisePerformance };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exerciseProgress?: { [exerciseId: string]: any };
  sessionNotes?: string;
  pausedTime?: number;
  isTimerActive?: boolean;
  accumulatedSeconds?: number;
  /**
   * `null` clears the field, `undefined` leaves it untouched. The distinction
   * matters: JSON.stringify drops undefined keys, so pausing must send an
   * explicit null or the server keeps a stale segment start and the elapsed
   * time is computed from the wrong origin.
   */
  lastPauseTime?: Date | string | null;
  segmentStartedAt?: Date | string | null;
}

// ============================================================================
// PRISMA MODEL TYPES (Updated for JSON system)
// ============================================================================

// 🚀 NEW WORKOUT TEMPLATE TYPE (with JSON data)
export type WorkoutTemplate = {
  id: string;
  name: string;
  description?: string | null;
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
  metadata?: Record<string, unknown>;
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
    personalRecords: LegacyPersonalRecord[];
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
  personalRecords: LegacyPersonalRecord[];
  volumeRecords: LegacyVolumeRecord[];

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
  exerciseType?: 'strength' | 'cardio' | 'flexibility';
  /** Library default for per-limb loading. See lib/volume.ts. */
  perSide?: boolean;
};

// 🧩 FORM SET — the flat shape used by the template editor UI (distinct from
// the JSON-based WorkoutSet). Built from / converted to WorkoutSet at the edges.
export type FormSet = {
  id: string;
  reps: number;
  weight: number;
  duration?: number;
  workoutTemplateId: string;
  exerciseId: string;
  createdAt: Date;
  updatedAt: Date;
};

// 🧩 FORM EDITOR EXERCISE — the exercise shape the template editor operates on.
export type FormEditorExercise = {
  id: string;
  name: string;
  muscles: string[];
  equipment: string[];
  createdAt: Date;
  updatedAt: Date;
  sets: FormSet[];
};

export type ExerciseList = {
  [key: string]: FormExercise;
};
