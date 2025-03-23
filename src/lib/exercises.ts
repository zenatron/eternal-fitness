import { ExerciseDatabase } from '@/types/exercises'

export const exercises: ExerciseDatabase = {
  // Compound Movements
  'Bench Press': {
    name: 'Bench Press',
    muscles: ['Chest', 'Triceps', 'Front Deltoids'],
    sets: { min: 3, max: 5 },
    reps: { min: 5, max: 12 },
    category: 'compound',
    equipment: ['Barbell', 'Bench']
  },
  'Lat Pulldown': {
    name: 'Lat Pulldown',
    muscles: ['Lats', 'Biceps', 'Upper Back'],
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 12 },
    category: 'compound',
    equipment: ['Cable Machine']
  },
  'Pull-Ups': {
    name: 'Pull-Ups',
    muscles: ['Lats', 'Biceps', 'Upper Back'],
    sets: { min: 3, max: 4 },
    reps: { min: 6, max: 12 },
    category: 'compound',
    equipment: ['Pull-up Bar']
  },
  'Dumbbell Lunges': {
    name: 'Dumbbell Lunges',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'compound',
    equipment: ['Dumbbells']
  },
  'Bulgarian Split Squats': {
    name: 'Bulgarian Split Squats',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 12 },
    category: 'compound',
    equipment: ['Bench', 'Dumbbells']
  },
  'Incline Dumbbell Press': {
    name: 'Incline Dumbbell Press',
    muscles: ['Upper Chest', 'Front Deltoids', 'Triceps'],
    category: 'compound',
    equipment: ['Dumbbells', 'Bench'],
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 12 }
  },
  'Dumbbell Incline Press': {
    name: 'Dumbbell Incline Press',
    muscles: ['Upper Chest', 'Front Deltoids', 'Triceps'],
    category: 'compound',
    equipment: ['Dumbbells', 'Bench'],
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 12 }
  },

  // Isolation Movements
  'Bicep Curls': {
    name: 'Bicep Curls',
    muscles: ['Biceps'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Dumbbells', 'Barbell']
  },
  'Lateral Raises': {
    name: 'Lateral Raises',
    muscles: ['Side Deltoids'],
    sets: { min: 3, max: 4 },
    reps: { min: 12, max: 15 },
    category: 'isolation',
    equipment: ['Dumbbells']
  },
  'Tricep Pushdowns': {
    name: 'Tricep Pushdowns',
    muscles: ['Triceps'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Cable Machine']
  },
  'Push-Ups': {
    name: 'Push-Ups',
    muscles: ['Chest', 'Triceps', 'Front Deltoids', 'Core'],
    sets: { min: 2, max: 4 },
    reps: { min: 8, max: 20 },
    category: 'compound',
    equipment: ['Body Weight']
  },
  'Hanging Leg Raises': {
    name: 'Hanging Leg Raises',
    muscles: ['Core', 'Hip Flexors'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Pull-up Bar']
  },
  'Step-Ups': {
    name: 'Step-Ups',
    muscles: ['Quadriceps', 'Glutes'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'compound',
    equipment: ['Box', 'Dumbbells']
  },
  'Hamstring Curls': {
    name: 'Hamstring Curls',
    muscles: ['Hamstrings'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Machine']
  },
  'Leg Press': {
    name: 'Leg Press',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 12 },
    category: 'compound',
    equipment: ['Machine']
  },
  'Calf Raises': {
    name: 'Calf Raises',
    muscles: ['Calves'],
    sets: { min: 3, max: 5 },
    reps: { min: 12, max: 20 },
    category: 'isolation',
    equipment: ['Machine', 'Body Weight']
  },
  'Frog Pumps': {
    name: 'Frog Pumps',
    muscles: ['Glutes'],
    sets: { min: 3, max: 4 },
    reps: { min: 15, max: 20 },
    category: 'isolation',
    equipment: ['Body Weight']
  },
  'Goblet Squats': {
    name: 'Goblet Squats',
    muscles: ['Quadriceps', 'Glutes', 'Core'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'compound',
    equipment: ['Dumbbells', 'Kettlebell']
  },
  'Dips': {
    name: 'Dips',
    muscles: ['Chest', 'Triceps', 'Front Deltoids'],
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 15 },
    category: 'compound',
    equipment: ['Dip Bars', 'Body Weight']
  },
  'Arnold Press': {
    name: 'Arnold Press',
    muscles: ['Shoulders', 'Triceps', 'Upper Chest'],
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 12 },
    category: 'compound',
    equipment: ['Dumbbells']
  },
  'Cable Chest Flys': {
    name: 'Cable Chest Flys',
    muscles: ['Chest', 'Front Deltoids'],
    sets: { min: 3, max: 4 },
    reps: { min: 12, max: 15 },
    category: 'isolation',
    equipment: ['Cable Machine']
  },
  'Close-Grip Bench Press': {
    name: 'Close-Grip Bench Press',
    muscles: ['Triceps', 'Chest', 'Front Deltoids'],
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 12 },
    category: 'compound',
    equipment: ['Barbell', 'Bench']
  },
  'Face Pulls': {
    name: 'Face Pulls',
    muscles: ['Rear Deltoids', 'Upper Back', 'Rotator Cuff'],
    sets: { min: 3, max: 4 },
    reps: { min: 12, max: 15 },
    category: 'isolation',
    equipment: ['Cable Machine', 'Resistance Band']
  },
  'Hammer Curls': {
    name: 'Hammer Curls',
    muscles: ['Biceps', 'Forearms'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Dumbbells']
  },
  'T-Bar Rows': {
    name: 'T-Bar Rows',
    muscles: ['Upper Back', 'Lats', 'Biceps'],
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 12 },
    category: 'compound',
    equipment: ['T-Bar Machine', 'Barbell']
  },
  'Seated Cable Rows': {
    name: 'Seated Cable Rows',
    muscles: ['Upper Back', 'Lats', 'Biceps'],
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 12 },
    category: 'compound',
    equipment: ['Cable Machine']
  },
  'Inverted Rows': {
    name: 'Inverted Rows',
    muscles: ['Upper Back', 'Biceps', 'Core'],
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 15 },
    category: 'compound',
    equipment: ['Body Weight', 'Bar']
  },
  'Preacher Curls': {
    name: 'Preacher Curls',
    muscles: ['Biceps'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Preacher Bench', 'Dumbbells', 'Barbell']
  },
  'Back Squats': {
    name: 'Back Squats',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
    sets: { min: 3, max: 5 },
    reps: { min: 5, max: 10 },
    category: 'compound',
    equipment: ['Barbell', 'Squat Rack']
  },
  'Walking Lunges': {
    name: 'Walking Lunges',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'compound',
    equipment: ['Body Weight', 'Dumbbells']
  },
  'Sumo Deadlifts': {
    name: 'Sumo Deadlifts',
    muscles: ['Hamstrings', 'Glutes', 'Lower Back', 'Quadriceps'],
    sets: { min: 3, max: 5 },
    reps: { min: 5, max: 10 },
    category: 'compound',
    equipment: ['Barbell']
  },
  'Glute Bridges': {
    name: 'Glute Bridges',
    muscles: ['Glutes', 'Hamstrings'],
    sets: { min: 3, max: 4 },
    reps: { min: 12, max: 20 },
    category: 'isolation',
    equipment: ['Body Weight', 'Barbell']
  },
  'Single-Leg Deadlifts': {
    name: 'Single-Leg Deadlifts',
    muscles: ['Hamstrings', 'Glutes', 'Lower Back', 'Core'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'compound',
    equipment: ['Dumbbells', 'Kettlebell']
  },
  'Glute Kickbacks': {
    name: 'Glute Kickbacks',
    muscles: ['Glutes', 'Hamstrings'],
    sets: { min: 3, max: 4 },
    reps: { min: 12, max: 20 },
    category: 'isolation',
    equipment: ['Cable Machine', 'Resistance Band']
  },
  'Overhead Tricep Extension': {
    name: 'Overhead Tricep Extension',
    muscles: ['Triceps'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Dumbbells', 'Cable Machine']
  },
  'Barbell Rows': {
    name: 'Barbell Rows',
    muscles: ['Upper Back', 'Lats', 'Biceps', 'Rear Deltoids'],
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 12 },
    category: 'compound',
    equipment: ['Barbell']
  },
  'Romanian Deadlifts': {
    name: 'Romanian Deadlifts',
    muscles: ['Hamstrings', 'Lower Back', 'Glutes'],
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 12 },
    category: 'compound',
    equipment: ['Barbell', 'Dumbbells']
  },
  'Dumbbell Lateral Raises': {
    name: 'Dumbbell Lateral Raises',
    muscles: ['Side Deltoids'],
    sets: { min: 3, max: 4 },
    reps: { min: 12, max: 15 },
    category: 'isolation',
    equipment: ['Dumbbells']
  },
  'Overhead Press': {
    name: 'Overhead Press',
    muscles: ['Shoulders', 'Triceps', 'Upper Chest'],
    sets: { min: 3, max: 4 },
    reps: { min: 6, max: 10 },
    category: 'compound',
    equipment: ['Barbell', 'Dumbbells']
  },
  'Tricep Dips': {
    name: 'Tricep Dips',
    muscles: ['Triceps', 'Chest', 'Front Deltoids'],
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 15 },
    category: 'compound',
    equipment: ['Dip Bars', 'Body Weight']
  },
  'Dumbbell Bicep Curls': {
    name: 'Dumbbell Bicep Curls',
    muscles: ['Biceps'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Dumbbells']
  },
  'Dumbbell Flys': {
    name: 'Dumbbell Flys',
    muscles: ['Chest', 'Front Deltoids'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Dumbbells', 'Bench']
  },
  'Dumbbell Shrugs': {
    name: 'Dumbbell Shrugs',
    muscles: ['Traps', 'Upper Back'],
    sets: { min: 3, max: 4 },
    reps: { min: 12, max: 15 },
    category: 'isolation',
    equipment: ['Dumbbells']
  },
  'Leg Extensions': {
    name: 'Leg Extensions',
    muscles: ['Quadriceps'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Machine']
  },
  'Front Squats': {
    name: 'Front Squats',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 12 },
    category: 'compound',
    equipment: ['Barbell', 'Squat Rack']
  },
  'Wall Sits': {
    name: 'Wall Sits',
    muscles: ['Core'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Body Weight']
  },
  'Dumbbell Front Raises': {
    name: 'Dumbbell Front Raises',
    muscles: ['Shoulders', 'Front Deltoids'],
    sets: { min: 3, max: 4 },
    reps: { min: 12, max: 15 },
    category: 'isolation',
    equipment: ['Dumbbells']
  },
  'Dumbbell Skull Crushers': {
    name: 'Dumbbell Skull Crushers',
    muscles: ['Triceps'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Dumbbells']
  },
  'Good Mornings': {
    name: 'Good Mornings',
    muscles: ['Lower Back', 'Hamstrings', 'Glutes'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Body Weight']
  },
  'Hip Thrusts': {
    name: 'Hip Thrusts',
    muscles: ['Glutes', 'Hamstrings'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Body Weight']
  },
  'Nordic Curls': {
    name: 'Nordic Curls',
    muscles: ['Biceps'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Body Weight']
  },
  'Back Extensions': {
    name: 'Back Extensions',
    muscles: ['Lower Back'],
    sets: { min: 3, max: 4 },
    reps: { min: 10, max: 15 },
    category: 'isolation',
    equipment: ['Body Weight']
  },
  'Core Work': {
    name: 'Core Work',
    muscles: ['Core', 'Hip Flexors'],
    sets: { min: 3, max: 4 },
    reps: { min: 12, max: 20 },
    category: 'isolation',
    equipment: ['Body Weight']
  }
} as const
