import { ExerciseList } from '@/types/workout';

export const exercises: ExerciseList = {
  // Compound Movements
  'Bench Press': {
    name: 'Bench Press',
    muscles: ['Chest', 'Triceps', 'Front Deltoids'],
    equipment: ['Barbell', 'Bench'],
  },
  'Lat Pulldown': {
    name: 'Lat Pulldown',
    muscles: ['Lats', 'Biceps', 'Upper Back'],
    equipment: ['Cable Machine'],
  },
  'Pull-Ups': {
    name: 'Pull-Ups',
    muscles: ['Lats', 'Biceps', 'Upper Back'],
    equipment: ['Pull-up Bar'],
  },
  'Dumbbell Lunges': {
    name: 'Dumbbell Lunges',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['Dumbbells'],
  },
  'Bulgarian Split Squats': {
    name: 'Bulgarian Split Squats',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['Bench', 'Dumbbells'],
  },
  'Incline Dumbbell Press': {
    name: 'Incline Dumbbell Press',
    muscles: ['Upper Chest', 'Front Deltoids', 'Triceps'],
    equipment: ['Dumbbells', 'Bench'],
  },
  'Dumbbell Incline Press': {
    name: 'Dumbbell Incline Press',
    muscles: ['Upper Chest', 'Front Deltoids', 'Triceps'],
    equipment: ['Dumbbells', 'Bench'],
  },

  // Isolation Movements
  'Bicep Curls': {
    name: 'Bicep Curls',
    muscles: ['Biceps'],
    equipment: ['Dumbbells', 'Barbell'],
  },
  'Lateral Raises': {
    name: 'Lateral Raises',
    muscles: ['Side Deltoids'],
    equipment: ['Dumbbells'],
  },
  'Tricep Pushdowns': {
    name: 'Tricep Pushdowns',
    muscles: ['Triceps'],
    equipment: ['Cable Machine'],
  },
  'Push-Ups': {
    name: 'Push-Ups',
    muscles: ['Chest', 'Triceps', 'Front Deltoids', 'Core'],
    equipment: ['Body Weight'],
  },
  'Hanging Leg Raises': {
    name: 'Hanging Leg Raises',
    muscles: ['Core', 'Hip Flexors'],
    equipment: ['Pull-up Bar'],
  },
  'Step-Ups': {
    name: 'Step-Ups',
    muscles: ['Quadriceps', 'Glutes'],
    equipment: ['Box', 'Dumbbells'],
  },
  'Hamstring Curls': {
    name: 'Hamstring Curls',
    muscles: ['Hamstrings'],
    equipment: ['Machine'],
  },
  'Leg Press': {
    name: 'Leg Press',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['Machine'],
  },
  'Calf Raises': {
    name: 'Calf Raises',
    muscles: ['Calves'],
    equipment: ['Machine', 'Body Weight'],
  },
  'Frog Pumps': {
    name: 'Frog Pumps',
    muscles: ['Glutes'],
    equipment: ['Body Weight'],
  },
  'Goblet Squats': {
    name: 'Goblet Squats',
    muscles: ['Quadriceps', 'Glutes', 'Core'],
    equipment: ['Dumbbells', 'Kettlebell'],
  },
  Dips: {
    name: 'Dips',
    muscles: ['Chest', 'Triceps', 'Front Deltoids'],
    equipment: ['Dip Bars', 'Body Weight'],
  },
  'Arnold Press': {
    name: 'Arnold Press',
    muscles: ['Shoulders', 'Triceps', 'Upper Chest'],
    equipment: ['Dumbbells'],
  },
  'Cable Chest Flys': {
    name: 'Cable Chest Flys',
    muscles: ['Chest', 'Front Deltoids'],
    equipment: ['Cable Machine'],
  },
  'Close-Grip Bench Press': {
    name: 'Close-Grip Bench Press',
    muscles: ['Triceps', 'Chest', 'Front Deltoids'],
    equipment: ['Barbell', 'Bench'],
  },
  'Face Pulls': {
    name: 'Face Pulls',
    muscles: ['Rear Deltoids', 'Upper Back', 'Rotator Cuff'],
    equipment: ['Cable Machine', 'Resistance Band'],
  },
  'Hammer Curls': {
    name: 'Hammer Curls',
    muscles: ['Biceps', 'Forearms'],
    equipment: ['Dumbbells'],
  },
  'T-Bar Rows': {
    name: 'T-Bar Rows',
    muscles: ['Upper Back', 'Lats', 'Biceps'],
    equipment: ['T-Bar Machine', 'Barbell'],
  },
  'Seated Cable Rows': {
    name: 'Seated Cable Rows',
    muscles: ['Upper Back', 'Lats', 'Biceps'],
    equipment: ['Cable Machine'],
  },
  'Inverted Rows': {
    name: 'Inverted Rows',
    muscles: ['Upper Back', 'Biceps', 'Core'],
    equipment: ['Body Weight', 'Bar'],
  },
  'Preacher Curls': {
    name: 'Preacher Curls',
    muscles: ['Biceps'],
    equipment: ['Preacher Bench', 'Dumbbells', 'Barbell'],
  },
  'Back Squats': {
    name: 'Back Squats',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
    equipment: ['Barbell', 'Squat Rack'],
  },
  'Walking Lunges': {
    name: 'Walking Lunges',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
    equipment: ['Body Weight', 'Dumbbells'],
  },
  'Sumo Deadlifts': {
    name: 'Sumo Deadlifts',
    muscles: ['Hamstrings', 'Glutes', 'Lower Back', 'Quadriceps'],
    equipment: ['Barbell'],
  },
  'Glute Bridges': {
    name: 'Glute Bridges',
    muscles: ['Glutes', 'Hamstrings'],
    equipment: ['Body Weight', 'Barbell'],
  },
  'Single-Leg Deadlifts': {
    name: 'Single-Leg Deadlifts',
    muscles: ['Hamstrings', 'Glutes', 'Lower Back', 'Core'],
    equipment: ['Dumbbells', 'Kettlebell'],
  },
  'Glute Kickbacks': {
    name: 'Glute Kickbacks',
    muscles: ['Glutes', 'Hamstrings'],
    equipment: ['Cable Machine', 'Resistance Band'],
  },
  'Overhead Tricep Extension': {
    name: 'Overhead Tricep Extension',
    muscles: ['Triceps'],
    equipment: ['Dumbbells', 'Cable Machine'],
  },
  'Barbell Rows': {
    name: 'Barbell Rows',
    muscles: ['Upper Back', 'Lats', 'Biceps', 'Rear Deltoids'],
    equipment: ['Barbell'],
  },
  'Romanian Deadlifts': {
    name: 'Romanian Deadlifts',
    muscles: ['Hamstrings', 'Lower Back', 'Glutes'],
    equipment: ['Barbell', 'Dumbbells'],
  },
  'Dumbbell Lateral Raises': {
    name: 'Dumbbell Lateral Raises',
    muscles: ['Side Deltoids'],
    equipment: ['Dumbbells'],
  },
  'Overhead Press': {
    name: 'Overhead Press',
    muscles: ['Shoulders', 'Triceps', 'Upper Chest'],
    equipment: ['Barbell', 'Dumbbells'],
  },
  'Tricep Dips': {
    name: 'Tricep Dips',
    muscles: ['Triceps', 'Chest', 'Front Deltoids'],
    equipment: ['Dip Bars', 'Body Weight'],
  },
  'Dumbbell Bicep Curls': {
    name: 'Dumbbell Bicep Curls',
    muscles: ['Biceps'],
    equipment: ['Dumbbells'],
  },
  'Dumbbell Flys': {
    name: 'Dumbbell Flys',
    muscles: ['Chest', 'Front Deltoids'],
    equipment: ['Dumbbells', 'Bench'],
  },
  'Dumbbell Shrugs': {
    name: 'Dumbbell Shrugs',
    muscles: ['Traps', 'Upper Back'],
    equipment: ['Dumbbells'],
  },
  'Leg Extensions': {
    name: 'Leg Extensions',
    muscles: ['Quadriceps'],
    equipment: ['Machine'],
  },
  'Front Squats': {
    name: 'Front Squats',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
    equipment: ['Barbell', 'Squat Rack'],
  },
  'Wall Sits': {
    name: 'Wall Sits',
    muscles: ['Core'],
    equipment: ['Body Weight'],
  },
  'Dumbbell Front Raises': {
    name: 'Dumbbell Front Raises',
    muscles: ['Shoulders', 'Front Deltoids'],
    equipment: ['Dumbbells'],
  },
  'Dumbbell Skull Crushers': {
    name: 'Dumbbell Skull Crushers',
    muscles: ['Triceps'],
    equipment: ['Dumbbells'],
  },
  'Good Mornings': {
    name: 'Good Mornings',
    muscles: ['Lower Back', 'Hamstrings', 'Glutes'],
    equipment: ['Body Weight'],
  },
  'Hip Thrusts': {
    name: 'Hip Thrusts',
    muscles: ['Glutes', 'Hamstrings'],
    equipment: ['Body Weight'],
  },
  'Nordic Curls': {
    name: 'Nordic Curls',
    muscles: ['Biceps'],
    equipment: ['Body Weight'],
  },
  'Back Extensions': {
    name: 'Back Extensions',
    muscles: ['Lower Back'],
    equipment: ['Body Weight'],
  },
  'Core Work': {
    name: 'Core Work',
    muscles: ['Core', 'Hip Flexors'],
    equipment: ['Body Weight'],
  },
} as const;
