// 🏆 SIMPLE PERSONAL RECORDS TYPES
// Based on exercises from src/lib/exercises.ts

export interface ExercisePR {
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
  type: 'maxWeight' | 'maxVolume' | 'maxDuration' | 'maxDistance';
  value: number;
  reps?: number;
  sets?: number;
  avgWeight?: number;
  sessionId: string;
}

// PR comparison result
export interface PRComparison {
  isNewPR: boolean;
  type: 'maxWeight' | 'maxVolume' | 'maxDuration' | 'maxDistance';
  improvement?: number;
  improvementPercent?: number;
  previousBest?: number;
}
