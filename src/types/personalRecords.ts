// 🏆 SIMPLE PERSONAL RECORDS TYPES
// Based on exercises from src/lib/exercises.ts

export interface ExercisePR {
  // Max weight achieved for this exercise
  maxWeight?: {
    value: number;        // Weight value (in user's preferred unit)
    reps: number;         // Reps achieved at this weight
    achievedAt: string;   // ISO date string
    sessionId: string;    // Reference to workout session
  };
  
  // Max volume achieved for this exercise in a single session
  maxVolume?: {
    value: number;        // Total volume (weight × reps × sets)
    achievedAt: string;   // ISO date string
    sessionId: string;    // Reference to workout session
    sets: number;         // Number of sets
    avgWeight: number;    // Average weight across sets
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
  type: 'maxWeight' | 'maxVolume';
  value: number;
  reps?: number;
  sets?: number;
  avgWeight?: number;
  sessionId: string;
}

// PR comparison result
export interface PRComparison {
  isNewPR: boolean;
  type: 'maxWeight' | 'maxVolume';
  improvement?: number;
  improvementPercent?: number;
  previousBest?: number;
}
