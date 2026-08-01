// 🏆 SIMPLE PERSONAL RECORDS TYPES
// Based on exercises from src/lib/exercises.ts

/** Every record type, in the order they should be presented. */
export const PR_TYPES = [
  'maxWeight',
  'maxOneRepMax',
  'maxVolume',
  'maxDuration',
  'maxDistance',
] as const;

export type PRType = (typeof PR_TYPES)[number];

export interface ExercisePR {
  /**
   * Best estimated 1RM. Distinct from maxWeight, which only knows the heaviest
   * load moved: 5x100 is a stronger performance than 1x105, and maxWeight
   * cannot see the difference. Stores the set it came from so the estimate is
   * attributable rather than a bare number.
   */
  maxOneRepMax?: {
    value: number;
    weight: number;
    reps: number;
    achievedAt: string;
    sessionId: string;
  };

  maxWeight?: {
    value: number;
    reps: number;
    achievedAt: string;
    sessionId: string;
  };

  maxVolume?: {
    value: number;
    achievedAt: string;
    sessionId: string;
    sets: number;
    avgWeight: number;
  };

  maxDuration?: {
    value: number;
    achievedAt: string;
    sessionId: string;
  };

  maxDistance?: {
    value: number;
    achievedAt: string;
    sessionId: string;
  };
}

// User's complete PR record - keys are exercise names from exercises.ts
export interface UserPersonalRecords {
  [exerciseName: string]: ExercisePR;
}

// Example structure:
// {
//   "Bench Press": {
//     "maxWeight": {
//       "value": 225,
//       "reps": 5,
//       "achievedAt": "2024-01-15T10:30:00Z",
//       "sessionId": "session-123"
//     },
//     "maxVolume": {
//       "value": 4500,
//       "achievedAt": "2024-01-20T11:00:00Z", 
//       "sessionId": "session-456",
//       "sets": 4,
//       "avgWeight": 200
//     }
//   },
//   "Back Squats": {
//     "maxWeight": {
//       "value": 315,
//       "reps": 3,
//       "achievedAt": "2024-01-18T09:45:00Z",
//       "sessionId": "session-789"
//     }
//   }
// }

// Helper type for PR updates
export interface PRUpdate {
  exerciseName: string;
  type: PRType;
  value: number;
  reps?: number;
  /** Load the estimate came from, for maxOneRepMax. */
  weight?: number;
  sets?: number;
  avgWeight?: number;
  sessionId: string;
}

// PR comparison result
export interface PRComparison {
  isNewPR: boolean;
  type: PRType;
  improvement?: number;
  improvementPercent?: number;
  previousBest?: number;
}

