import { SplitDatabase } from '@/types/workout'

export const splits: SplitDatabase = {
  'TwoDay': {
    name: 'Two Day Split',
    description: 'Upper/Lower split for twice per week training',
    daysPerWeek: 2,
    pattern: ['upper', 'lower', 'rest', 'rest', 'rest', 'rest', 'rest'],
    days: {
      upper: {
        name: 'Upper Body',
        description: 'Focus on chest, back, shoulders, and arms',
        primary: [
          'Bench Press',
          'Barbell Rows',
          'Overhead Press'
        ],
        secondary: [
          'Lat Pulldown',
          'Tricep Pushdowns',
          'Bicep Curls',
          'Lateral Raises',
          'Face Pulls',
          'Dips',
          'Pull-Ups',
          'Dumbbell Incline Press'
        ]
      },
      lower: {
        name: 'Lower Body',
        description: 'Focus on legs and core',
        primary: [
          'Back Squats',
          'Romanian Deadlifts',
          'Bulgarian Split Squats'
        ],
        secondary: [
          'Leg Press',
          'Walking Lunges',
          'Calf Raises',
          'Leg Extensions',
          'Hamstring Curls',
          'Glute Bridges',
          'Hip Thrusts',
          'Core Work'
        ]
      }
    }
  },

  'ThreeDay': {
    name: 'Push/Pull/Legs',
    description: 'A 3-day split targeting push, pull, and leg movements',
    daysPerWeek: 3,
    pattern: ['push', 'rest', 'pull', 'rest', 'legs', 'rest', 'rest'],
    days: {
      push: {
        name: 'Push',
        description: 'Chest, Shoulders, Triceps',
        primary: [
          'Incline Dumbbell Press',
          'Overhead Tricep Extension',
          'Dumbbell Lateral Raises'
        ],
        secondary: [
          'Bench Press',
          'Dips',
          'Arnold Press',
          'Cable Chest Flys',
          'Close-Grip Bench Press',
          'Push-Ups',
          'Face Pulls'
        ]
      },
      pull: {
        name: 'Pull',
        description: 'Back, Biceps',
        primary: [
          'Barbell Rows',
          'Lat Pulldown',
          'Hammer Curls'
        ],
        secondary: [
          'Dumbbell Bicep Curls',
          'Face Pulls',
          'T-Bar Rows',
          'Pull-Ups',
          'Seated Cable Rows',
          'Inverted Rows',
          'Preacher Curls'
        ]
      },
      legs: {
        name: 'Legs',
        description: 'Legs, Glutes',
        primary: [
          'Back Squats',
          'Romanian Deadlifts',
          'Bulgarian Split Squats'
        ],
        secondary: [
          'Leg Press',
          'Walking Lunges',
          'Hamstring Curls',
          'Sumo Deadlifts',
          'Step-Ups',
          'Calf Raises',
          'Frog Pumps'
        ]
      }
    }
  },

  'FourDay': {
    name: 'Upper/Lower A/B',
    description: 'A 4-day split alternating between upper and lower body workouts',
    daysPerWeek: 4,
    pattern: ['upperA', 'lowerA', 'rest', 'rest', 'upperB', 'lowerB', 'rest'],
    days: {
      upperA: {
        name: 'Upper Body A',
        description: 'Chest, Back, Shoulders, Triceps focus',
        primary: [
          'Bench Press',
          'Overhead Press',
          'Barbell Rows'
        ],
        secondary: [
          'Tricep Dips',
          'Incline Dumbbell Press',
          'Face Pulls',
          'Dumbbell Flys',
          'Lat Pulldown',
          'Overhead Tricep Extension',
          'Dumbbell Shrugs'
        ]
      },
      lowerA: {
        name: 'Lower Body A',
        description: 'Legs, Glutes with Quad focus',
        primary: [
          'Back Squats',
          'Romanian Deadlifts',
          'Leg Press'
        ],
        secondary: [
          'Bulgarian Split Squats',
          'Walking Lunges',
          'Calf Raises',
          'Leg Extensions',
          'Glute Bridges',
          'Step-Ups',
          'Hanging Leg Raises'
        ]
      },
      upperB: {
        name: 'Upper Body B',
        description: 'Chest, Back, Shoulders, Biceps focus',
        primary: [
          'Incline Dumbbell Press',
          'Pull-Ups',
          'Arnold Press'
        ],
        secondary: [
          'Dumbbell Lateral Raises',
          'Cable Chest Flys',
          'Hammer Curls',
          'Face Pulls',
          'Seated Cable Rows',
          'Dumbbell Bicep Curls',
          'Push-Ups'
        ]
      },
      lowerB: {
        name: 'Lower Body B',
        description: 'Legs, Glutes with Hamstring focus',
        primary: [
          'Romanian Deadlifts',
          'Bulgarian Split Squats',
          'Sumo Deadlifts'
        ],
        secondary: [
          'Hamstring Curls',
          'Single-Leg Deadlifts',
          'Glute Bridges',
          'Walking Lunges',
          'Calf Raises',
          'Glute Kickbacks',
          'Frog Pumps'
        ]
      }
    }
  },

  'FiveDay': {
    name: 'Body Part Split',
    description: 'A 5-day split targeting different muscle groups each day',
    daysPerWeek: 5,
    pattern: ['upperStrength', 'lowerStrength', 'push', 'pull', 'legs', 'rest', 'rest'],
    days: {
      upperStrength: {
        name: 'Upper Body Strength',
        description: 'Heavy compound movements for upper body',
        primary: [
          'Bench Press',
          'Barbell Rows',
          'Overhead Press'
        ],
        secondary: [
          'Pull-Ups',
          'Incline Dumbbell Press',
          'Dumbbell Lateral Raises',
          'Face Pulls',
          'Dips'
        ]
      },
      lowerStrength: {
        name: 'Lower Body Strength',
        description: 'Heavy compound movements for lower body',
        primary: [
          'Back Squats',
          'Romanian Deadlifts',
          'Bulgarian Split Squats'
        ],
        secondary: [
          'Leg Press',
          'Walking Lunges',
          'Calf Raises',
          'Glute Bridges',
          'Hamstring Curls'
        ]
      },
      push: {
        name: 'Push Hypertrophy',
        description: 'Push movements for muscle growth',
        primary: [
          'Incline Dumbbell Press',
          'Overhead Press',
          'Dips'
        ],
        secondary: [
          'Cable Chest Flys',
          'Lateral Raises',
          'Tricep Pushdowns',
          'Push-Ups',
          'Close-Grip Bench Press'
        ]
      },
      pull: {
        name: 'Pull Hypertrophy',
        description: 'Pull movements for muscle growth',
        primary: [
          'Barbell Rows',
          'Pull-Ups',
          'Hammer Curls'
        ],
        secondary: [
          'Face Pulls',
          'Lat Pulldown',
          'Dumbbell Bicep Curls',
          'Seated Cable Rows',
          'T-Bar Rows'
        ]
      },
      legs: {
        name: 'Legs Hypertrophy',
        description: 'Leg movements for muscle growth',
        primary: [
          'Leg Press',
          'Romanian Deadlifts',
          'Bulgarian Split Squats'
        ],
        secondary: [
          'Walking Lunges',
          'Calf Raises',
          'Hamstring Curls',
          'Glute Bridges',
          'Step-Ups'
        ]
      }
    }
  },

  'SixDay': {
    name: 'Six Day Body Part Split',
    description: 'A comprehensive 6-day split targeting each muscle group with high frequency',
    daysPerWeek: 6,
    pattern: ['push', 'pull', 'quads', 'chest', 'arms', 'hams', 'rest'],
    days: {
      push: {
        name: 'Chest, Shoulders & Triceps',
        description: 'Push movements focusing on upper body',
        primary: [
          'Bench Press',
          'Incline Dumbbell Press',
          'Overhead Tricep Extension'
        ],
        secondary: [
          'Dumbbell Lateral Raises',
          'Dumbbell Flys',
          'Arnold Press',
          'Push-Ups',
          'Cable Chest Flys',
          'Tricep Pushdowns'
        ]
      },
      pull: {
        name: 'Back & Biceps',
        description: 'Pull movements for back and arm development',
        primary: [
          'Pull-Ups',
          'Barbell Rows',
          'Lat Pulldown'
        ],
        secondary: [
          'Bicep Curls',
          'Hammer Curls',
          'Face Pulls',
          'Seated Cable Rows',
          'T-Bar Rows',
          'Preacher Curls'
        ]
      },
      quads: {
        name: 'Quad-Focused Legs',
        description: 'Lower body focusing on quadriceps',
        primary: [
          'Back Squats',
          'Bulgarian Split Squats',
          'Leg Press'
        ],
        secondary: [
          'Walking Lunges',
          'Step-Ups',
          'Leg Extensions',
          'Front Squats',
          'Wall Sits',
          'Calf Raises'
        ]
      },
      chest: {
        name: 'Chest & Back',
        description: 'Upper body compound movements',
        primary: [
          'Bench Press',
          'Barbell Rows',
          'Lat Pulldown'
        ],
        secondary: [
          'Cable Chest Flys',
          'Push-Ups',
          'Pull-Ups',
          'Dumbbell Flys',
          'Inverted Rows',
          'Seated Cable Rows'
        ]
      },
      arms: {
        name: 'Arms & Shoulders',
        description: 'Focused arm and shoulder development',
        primary: [
          'Overhead Press',
          'Bicep Curls',
          'Tricep Dips'
        ],
        secondary: [
          'Dumbbell Front Raises',
          'Lateral Raises',
          'Dumbbell Skull Crushers',
          'Hammer Curls',
          'Face Pulls',
          'Arnold Press'
        ]
      },
      hams: {
        name: 'Hamstring-Focused Legs',
        description: 'Lower body focusing on posterior chain',
        primary: [
          'Romanian Deadlifts',
          'Sumo Deadlifts',
          'Hamstring Curls'
        ],
        secondary: [
          'Good Mornings',
          'Glute Bridges',
          'Single-Leg Deadlifts',
          'Hip Thrusts',
          'Nordic Curls',
          'Back Extensions'
        ]
      }
    }
  }
} as const 