import { ExerciseList } from '@/types/workout';

export const exercises: ExerciseList = {
  // ============================================================================
  // CHEST EXERCISES
  // ============================================================================

  // Compound Chest Movements
  'Bench Press': {
    name: 'Bench Press',
    muscles: ['Chest', 'Triceps', 'Front Deltoids'],
    equipment: ['Barbell', 'Bench'],
  },
  'Incline Bench Press': {
    name: 'Incline Bench Press',
    muscles: ['Upper Chest', 'Triceps', 'Front Deltoids'],
    equipment: ['Barbell', 'Incline Bench'],
  },
  'Decline Bench Press': {
    name: 'Decline Bench Press',
    muscles: ['Chest', 'Triceps', 'Front Deltoids'],
    equipment: ['Barbell', 'Decline Bench'],
  },
  'Dumbbell Bench Press': {
    name: 'Dumbbell Bench Press',
    muscles: ['Chest', 'Triceps', 'Front Deltoids'],
    equipment: ['Dumbbells', 'Bench'],
  },
  'Incline Dumbbell Press': {
    name: 'Incline Dumbbell Press',
    muscles: ['Upper Chest', 'Triceps', 'Front Deltoids'],
    equipment: ['Dumbbells', 'Incline Bench'],
  },
  'Decline Dumbbell Press': {
    name: 'Decline Dumbbell Press',
    muscles: ['Chest', 'Triceps', 'Front Deltoids'],
    equipment: ['Dumbbells', 'Decline Bench'],
  },
  'Chest Press Machine': {
    name: 'Chest Press Machine',
    muscles: ['Chest', 'Triceps', 'Front Deltoids'],
    equipment: ['Chest Press Machine'],
  },

  // Chest Isolation
  'Dumbbell Flys': {
    name: 'Dumbbell Flys',
    muscles: ['Chest', 'Front Deltoids'],
    equipment: ['Dumbbells', 'Bench'],
  },
  'Incline Dumbbell Flys': {
    name: 'Incline Dumbbell Flys',
    muscles: ['Upper Chest', 'Front Deltoids'],
    equipment: ['Dumbbells', 'Incline Bench'],
  },
  'Cable Chest Flys': {
    name: 'Cable Chest Flys',
    muscles: ['Chest', 'Front Deltoids'],
    equipment: ['Cable Machine'],
  },
  'Pec Deck Flys': {
    name: 'Pec Deck Flys',
    muscles: ['Chest', 'Front Deltoids'],
    equipment: ['Pec Deck Machine'],
  },
  'Cable Crossovers': {
    name: 'Cable Crossovers',
    muscles: ['Chest', 'Front Deltoids'],
    equipment: ['Cable Crossover'],
  },

  // Bodyweight Chest
  'Push-Ups': {
    name: 'Push-Ups',
    muscles: ['Chest', 'Triceps', 'Front Deltoids', 'Core'],
    equipment: ['Body Weight'],
  },
  'Incline Push-Ups': {
    name: 'Incline Push-Ups',
    muscles: ['Chest', 'Triceps', 'Front Deltoids'],
    equipment: ['Body Weight', 'Bench'],
  },
  'Decline Push-Ups': {
    name: 'Decline Push-Ups',
    muscles: ['Upper Chest', 'Triceps', 'Front Deltoids'],
    equipment: ['Body Weight', 'Bench'],
  },
  'Diamond Push-Ups': {
    name: 'Diamond Push-Ups',
    muscles: ['Triceps', 'Chest', 'Front Deltoids'],
    equipment: ['Body Weight'],
  },
  'Wide-Grip Push-Ups': {
    name: 'Wide-Grip Push-Ups',
    muscles: ['Chest', 'Triceps', 'Front Deltoids'],
    equipment: ['Body Weight'],
  },
  'Dips': {
    name: 'Dips',
    muscles: ['Chest', 'Triceps', 'Front Deltoids'],
    equipment: ['Dip Bars', 'Body Weight'],
  },

  // ============================================================================
  // BACK EXERCISES
  // ============================================================================

  // Vertical Pulling
  'Pull-Ups': {
    name: 'Pull-Ups',
    muscles: ['Lats', 'Biceps', 'Upper Back'],
    equipment: ['Pull-up Bar'],
  },
  'Chin-Ups': {
    name: 'Chin-Ups',
    muscles: ['Lats', 'Biceps', 'Upper Back'],
    equipment: ['Pull-up Bar'],
  },
  'Wide-Grip Pull-Ups': {
    name: 'Wide-Grip Pull-Ups',
    muscles: ['Lats', 'Upper Back', 'Biceps'],
    equipment: ['Pull-up Bar'],
  },
  'Lat Pulldown': {
    name: 'Lat Pulldown',
    muscles: ['Lats', 'Biceps', 'Upper Back'],
    equipment: ['Lat Pulldown Machine', 'Lat Bar'],
  },
  'Wide-Grip Lat Pulldown': {
    name: 'Wide-Grip Lat Pulldown',
    muscles: ['Lats', 'Upper Back', 'Biceps'],
    equipment: ['Lat Pulldown Machine', 'Lat Bar'],
  },
  'Close-Grip Lat Pulldown': {
    name: 'Close-Grip Lat Pulldown',
    muscles: ['Lats', 'Biceps', 'Upper Back'],
    equipment: ['Lat Pulldown Machine', 'V-Bar'],
  },

  // Horizontal Pulling
  'Barbell Rows': {
    name: 'Barbell Rows',
    muscles: ['Upper Back', 'Lats', 'Biceps', 'Rear Deltoids'],
    equipment: ['Barbell'],
  },
  'Dumbbell Rows': {
    name: 'Dumbbell Rows',
    muscles: ['Upper Back', 'Lats', 'Biceps', 'Rear Deltoids'],
    equipment: ['Dumbbells', 'Bench'],
  },
  'Single-Arm Dumbbell Row': {
    name: 'Single-Arm Dumbbell Row',
    muscles: ['Upper Back', 'Lats', 'Biceps', 'Rear Deltoids'],
    equipment: ['Dumbbells', 'Bench'],
  },
  'Seated Cable Rows': {
    name: 'Seated Cable Rows',
    muscles: ['Upper Back', 'Lats', 'Biceps'],
    equipment: ['Seated Row Machine', 'V-Bar'],
  },
  'T-Bar Rows': {
    name: 'T-Bar Rows',
    muscles: ['Upper Back', 'Lats', 'Biceps'],
    equipment: ['T-Bar Machine'],
  },
  'Chest-Supported Row': {
    name: 'Chest-Supported Row',
    muscles: ['Upper Back', 'Lats', 'Biceps', 'Rear Deltoids'],
    equipment: ['Machine'],
  },
  'Inverted Rows': {
    name: 'Inverted Rows',
    muscles: ['Upper Back', 'Biceps', 'Core'],
    equipment: ['Body Weight', 'Bar'],
  },
  'Pendlay Row': {
    name: 'Pendlay Row',
    muscles: ['Back', 'Biceps'],
    equipment: ['Barbell'],
  },
  'Meadows Row': {
    name: 'Meadows Row',
    muscles: ['Back', 'Rear Deltoids'],
    equipment: ['Barbell', 'Landmine'],
  },
  'Seal Row': {
    name: 'Seal Row',
    muscles: ['Back', 'Biceps'],
    equipment: ['Barbell', 'Bench'],
  },

  // Back Isolation
  'Face Pulls': {
    name: 'Face Pulls',
    muscles: ['Rear Deltoids', 'Upper Back', 'Rotator Cuff'],
    equipment: ['Cable Machine', 'Resistance Band', 'Rope Attachment'],
  },
  'Band Pull-Aparts': {
    name: 'Band Pull-Aparts',
    muscles: ['Rear Deltoids', 'Upper Back'],
    equipment: ['Resistance Band'],
  },
  'Reverse Flys': {
    name: 'Reverse Flys',
    muscles: ['Rear Deltoids', 'Upper Back'],
    equipment: ['Dumbbells', 'Cable Machine'],
  },
  'Shrugs': {
    name: 'Shrugs',
    muscles: ['Traps', 'Upper Back'],
    equipment: ['Dumbbells', 'Barbell'],
  },
  'Dumbbell Shrugs': {
    name: 'Dumbbell Shrugs',
    muscles: ['Traps', 'Upper Back'],
    equipment: ['Dumbbells'],
  },
  'Barbell Shrugs': {
    name: 'Barbell Shrugs',
    muscles: ['Traps', 'Upper Back'],
    equipment: ['Barbell'],
  },

  // ============================================================================
  // SHOULDER EXERCISES
  // ============================================================================

  // Compound Shoulder Movements
  'Overhead Press': {
    name: 'Overhead Press',
    muscles: ['Shoulders', 'Triceps', 'Upper Chest'],
    equipment: ['Olympic Barbell', 'Power Rack'],
  },
  'Military Press': {
    name: 'Military Press',
    muscles: ['Shoulders', 'Triceps', 'Core'],
    equipment: ['Olympic Barbell'],
  },
  'Shoulder Press Machine': {
    name: 'Shoulder Press Machine',
    muscles: ['Shoulders', 'Triceps'],
    equipment: ['Shoulder Press Machine'],
  },
  'Dumbbell Shoulder Press': {
    name: 'Dumbbell Shoulder Press',
    muscles: ['Shoulders', 'Triceps'],
    equipment: ['Dumbbells'],
  },
  'Seated Dumbbell Press': {
    name: 'Seated Dumbbell Press',
    muscles: ['Shoulders', 'Triceps'],
    equipment: ['Dumbbells', 'Bench'],
  },
  'Arnold Press': {
    name: 'Arnold Press',
    muscles: ['Shoulders', 'Triceps'],
    equipment: ['Dumbbells'],
  },
  'Pike Push-Ups': {
    name: 'Pike Push-Ups',
    muscles: ['Shoulders', 'Triceps'],
    equipment: ['Body Weight'],
  },
  'Handstand Push-Ups': {
    name: 'Handstand Push-Ups',
    muscles: ['Shoulders', 'Triceps', 'Core'],
    equipment: ['Body Weight'],
  },

  // Front Deltoid Isolation
  'Front Raises': {
    name: 'Front Raises',
    muscles: ['Front Deltoids'],
    equipment: ['Dumbbells'],
  },
  'Dumbbell Front Raises': {
    name: 'Dumbbell Front Raises',
    muscles: ['Front Deltoids'],
    equipment: ['Dumbbells'],
  },
  'Barbell Front Raises': {
    name: 'Barbell Front Raises',
    muscles: ['Front Deltoids'],
    equipment: ['Barbell'],
  },
  'Cable Front Raises': {
    name: 'Cable Front Raises',
    muscles: ['Front Deltoids'],
    equipment: ['Cable Machine'],
  },

  // Side Deltoid Isolation
  'Lateral Raises': {
    name: 'Lateral Raises',
    muscles: ['Side Deltoids'],
    equipment: ['Dumbbells'],
  },
  'Dumbbell Lateral Raises': {
    name: 'Dumbbell Lateral Raises',
    muscles: ['Side Deltoids'],
    equipment: ['Dumbbells'],
  },
  'Cable Lateral Raises': {
    name: 'Cable Lateral Raises',
    muscles: ['Side Deltoids'],
    equipment: ['Cable Machine', 'D-Handle'],
  },
  'Band Lateral Raises': {
    name: 'Band Lateral Raises',
    muscles: ['Side Deltoids'],
    equipment: ['Resistance Band'],
  },
  'Machine Lateral Raises': {
    name: 'Machine Lateral Raises',
    muscles: ['Side Deltoids'],
    equipment: ['Machine'],
  },

  // Rear Deltoid Isolation
  'Rear Delt Flys': {
    name: 'Rear Delt Flys',
    muscles: ['Rear Deltoids'],
    equipment: ['Dumbbells'],
  },
  'Bent-Over Lateral Raises': {
    name: 'Bent-Over Lateral Raises',
    muscles: ['Rear Deltoids'],
    equipment: ['Dumbbells'],
  },
  'Cable Rear Delt Flys': {
    name: 'Cable Rear Delt Flys',
    muscles: ['Rear Deltoids'],
    equipment: ['Cable Machine'],
  },
  'Viking Press': {
    name: 'Viking Press',
    muscles: ['Shoulders', 'Triceps'],
    equipment: ['Landmine'],
  },
  'Lu Raise': {
    name: 'Lu Raise',
    muscles: ['Front Deltoids', 'Side Deltoids'],
    equipment: ['Dumbbells'],
  },
  'Landmine Press': {
    name: 'Landmine Press',
    muscles: ['Shoulders', 'Chest', 'Triceps'],
    equipment: ['Barbell', 'Landmine'],
  },
  'Landmine Row': {
    name: 'Landmine Row',
    muscles: ['Back', 'Biceps'],
    equipment: ['Barbell', 'Landmine'],
  },

  // ============================================================================
  // ARM EXERCISES - BICEPS
  // ============================================================================

  'Bicep Curls': {
    name: 'Bicep Curls',
    muscles: ['Biceps'],
    equipment: ['Dumbbells'],
  },
  'Dumbbell Bicep Curls': {
    name: 'Dumbbell Bicep Curls',
    muscles: ['Biceps'],
    equipment: ['Dumbbells'],
  },
  'Barbell Curls': {
    name: 'Barbell Curls',
    muscles: ['Biceps'],
    equipment: ['Barbell'],
  },
  'EZ-Bar Curls': {
    name: 'EZ-Bar Curls',
    muscles: ['Biceps'],
    equipment: ['EZ-Curl Bar'],
  },
  'Hammer Curls': {
    name: 'Hammer Curls',
    muscles: ['Biceps', 'Forearms'],
    equipment: ['Dumbbells'],
  },
  'Preacher Curls': {
    name: 'Preacher Curls',
    muscles: ['Biceps'],
    equipment: ['Preacher Bench', 'Dumbbells', 'Barbell'],
  },
  'Spider Curls': {
    name: 'Spider Curls',
    muscles: ['Biceps'],
    equipment: ['Dumbbells'],
  },
  'Cable Curls': {
    name: 'Cable Curls',
    muscles: ['Biceps'],
    equipment: ['Cable Machine'],
  },
  'Cable Rope Hammer Curls': {
    name: 'Cable Rope Hammer Curls',
    muscles: ['Biceps', 'Brachialis', 'Forearms'],
    equipment: ['Cable Machine', 'Rope Attachment'],
  },
  'Concentration Curls': {
    name: 'Concentration Curls',
    muscles: ['Biceps'],
    equipment: ['Dumbbells'],
  },
  'Incline Dumbbell Curls': {
    name: 'Incline Dumbbell Curls',
    muscles: ['Biceps'],
    equipment: ['Dumbbells', 'Incline Bench'],
  },
  'Behind-the-Back Cable Curl': {
    name: 'Behind-the-Back Cable Curl',
    muscles: ['Biceps'],
    equipment: ['Cable Machine'],
  },
  'Bayesian Cable Curl': {
    name: 'Bayesian Cable Curl',
    muscles: ['Biceps'],
    equipment: ['Cable Machine'],
  },
  'Spider Curl': {
    name: 'Spider Curl',
    muscles: ['Biceps'],
    equipment: ['Dumbbells', 'Incline Bench'],
  },
  'Concentration Curl': {
    name: 'Concentration Curl',
    muscles: ['Biceps'],
    equipment: ['Dumbbell'],
  },
  'Zottman Curl': {
    name: 'Zottman Curl',
    muscles: ['Biceps', 'Forearms'],
    equipment: ['Dumbbells'],
  },

  // ============================================================================
  // ARM EXERCISES - TRICEPS
  // ============================================================================

  'Tricep Pushdowns': {
    name: 'Tricep Pushdowns',
    muscles: ['Triceps'],
    equipment: ['Cable Machine'],
  },
  'Close-Grip Bench Press': {
    name: 'Close-Grip Bench Press',
    muscles: ['Triceps', 'Chest', 'Front Deltoids'],
    equipment: ['Barbell', 'Bench'],
  },
  'Overhead Tricep Extension': {
    name: 'Overhead Tricep Extension',
    muscles: ['Triceps'],
    equipment: ['Dumbbells', 'Cable Machine'],
  },
  'Dumbbell Skull Crushers': {
    name: 'Dumbbell Skull Crushers',
    muscles: ['Triceps'],
    equipment: ['Dumbbells', 'Bench'],
  },
  'Barbell Skull Crushers': {
    name: 'Barbell Skull Crushers',
    muscles: ['Triceps'],
    equipment: ['Barbell', 'Bench'],
  },
  'Tricep Dips': {
    name: 'Tricep Dips',
    muscles: ['Triceps', 'Chest', 'Front Deltoids'],
    equipment: ['Dip Bars', 'Body Weight'],
  },
  'Bench Dips': {
    name: 'Bench Dips',
    muscles: ['Triceps', 'Front Deltoids'],
    equipment: ['Bench', 'Body Weight'],
  },
  'Cable Overhead Extension': {
    name: 'Cable Overhead Extension',
    muscles: ['Triceps'],
    equipment: ['Cable Machine'],
  },
  'Kickbacks': {
    name: 'Kickbacks',
    muscles: ['Triceps'],
    equipment: ['Dumbbells'],
  },
  'JM Press': {
    name: 'JM Press',
    muscles: ['Triceps'],
    equipment: ['Barbell', 'Bench'],
  },

  // ============================================================================
  // LEG EXERCISES - QUADRICEPS
  // ============================================================================

  // Compound Quad Movements
  'Back Squats': {
    name: 'Back Squats',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
    equipment: ['Olympic Barbell', 'Power Rack'],
  },
  'Front Squats': {
    name: 'Front Squats',
    muscles: ['Quadriceps', 'Glutes', 'Core'],
    equipment: ['Olympic Barbell', 'Power Rack'],
  },
  'Goblet Squats': {
    name: 'Goblet Squats',
    muscles: ['Quadriceps', 'Glutes', 'Core'],
    equipment: ['Dumbbells', 'Kettlebell'],
  },
  'Dumbbell Squats': {
    name: 'Dumbbell Squats',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['Dumbbells'],
  },
  'Hack Squats': {
    name: 'Hack Squats',
    muscles: ['Quadriceps', 'Glutes'],
    equipment: ['Hack Squat Machine'],
  },
  'Smith Machine Squats': {
    name: 'Smith Machine Squats',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['Smith Machine'],
  },
  'Leg Press': {
    name: 'Leg Press',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['Leg Press Machine'],
  },
  'Bulgarian Split Squats': {
    name: 'Bulgarian Split Squats',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['Bench', 'Dumbbells'],
  },
  'Lunges': {
    name: 'Lunges',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['Body Weight', 'Dumbbells'],
  },
  'Dumbbell Lunges': {
    name: 'Dumbbell Lunges',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['Dumbbells'],
  },
  'Walking Lunges': {
    name: 'Walking Lunges',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
    equipment: ['Body Weight', 'Dumbbells'],
  },
  'Reverse Lunges': {
    name: 'Reverse Lunges',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['Body Weight', 'Dumbbells'],
  },
  'Lateral Lunges': {
    name: 'Lateral Lunges',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['Body Weight', 'Dumbbells'],
  },
  'Step-Ups': {
    name: 'Step-Ups',
    muscles: ['Quadriceps', 'Glutes'],
    equipment: ['Box', 'Dumbbells'],
  },

  // Quad Isolation
  'Leg Extensions': {
    name: 'Leg Extensions',
    muscles: ['Quadriceps'],
    equipment: ['Leg Extension Machine'],
  },
  'Single-Leg Extensions': {
    name: 'Single-Leg Extensions',
    muscles: ['Quadriceps'],
    equipment: ['Leg Extension Machine'],
  },
  'Sissy Squat': {
    name: 'Sissy Squat',
    muscles: ['Quadriceps'],
    equipment: ['Bodyweight'],
  },
  'Zercher Squat': {
    name: 'Zercher Squat',
    muscles: ['Quadriceps', 'Core', 'Biceps'],
    equipment: ['Barbell'],
  },
  'Belt Squat': {
    name: 'Belt Squat',
    muscles: ['Quadriceps', 'Glutes'],
    equipment: ['Belt Squat Machine'],
  },

  // ============================================================================
  // LEG EXERCISES - HAMSTRINGS
  // ============================================================================

  'Romanian Deadlifts': {
    name: 'Romanian Deadlifts',
    muscles: ['Hamstrings', 'Glutes', 'Lower Back'],
    equipment: ['Barbell', 'Dumbbells'],
  },
  'Stiff-Leg Deadlifts': {
    name: 'Stiff-Leg Deadlifts',
    muscles: ['Hamstrings', 'Glutes', 'Lower Back'],
    equipment: ['Barbell', 'Dumbbells'],
  },
  'Single-Leg Deadlifts': {
    name: 'Single-Leg Deadlifts',
    muscles: ['Hamstrings', 'Glutes', 'Lower Back', 'Core'],
    equipment: ['Dumbbells', 'Kettlebell'],
  },
  'Hamstring Curls': {
    name: 'Hamstring Curls',
    muscles: ['Hamstrings'],
    equipment: ['Leg Curl Machine'],
  },
  'Lying Leg Curls': {
    name: 'Lying Leg Curls',
    muscles: ['Hamstrings'],
    equipment: ['Leg Curl Machine'],
  },
  'Seated Leg Curls': {
    name: 'Seated Leg Curls',
    muscles: ['Hamstrings'],
    equipment: ['Leg Curl Machine'],
  },
  'Standing Leg Curls': {
    name: 'Standing Leg Curls',
    muscles: ['Hamstrings'],
    equipment: ['Leg Curl Machine'],
  },
  'Good Mornings': {
    name: 'Good Mornings',
    muscles: ['Hamstrings', 'Lower Back', 'Glutes'],
    equipment: ['Barbell'],
  },
  'Nordic Curls': {
    name: 'Nordic Curls',
    muscles: ['Hamstrings'],
    equipment: ['Body Weight'],
  },
  'Glute Ham Raise': {
    name: 'Glute Ham Raise',
    muscles: ['Hamstrings', 'Glutes'],
    equipment: ['GHD'],
  },
  'Nordic Hamstring Curl': {
    name: 'Nordic Hamstring Curl',
    muscles: ['Hamstrings'],
    equipment: ['Bodyweight'],
  },

  // ============================================================================
  // LEG EXERCISES - GLUTES
  // ============================================================================

  'Hip Thrusts': {
    name: 'Hip Thrusts',
    muscles: ['Glutes', 'Hamstrings'],
    equipment: ['Barbell', 'Bench'],
  },
  'Machine Hip Thrusts': {
    name: 'Machine Hip Thrusts',
    muscles: ['Glutes', 'Hamstrings'],
    equipment: ['Hip Thrust Machine'],
  },
  'Glute Bridges': {
    name: 'Glute Bridges',
    muscles: ['Glutes', 'Hamstrings'],
    equipment: ['Body Weight', 'Barbell'],
  },
  'Single-Leg Glute Bridges': {
    name: 'Single-Leg Glute Bridges',
    muscles: ['Glutes', 'Hamstrings'],
    equipment: ['Body Weight'],
  },
  'Sumo Deadlifts': {
    name: 'Sumo Deadlifts',
    muscles: ['Glutes', 'Hamstrings', 'Quadriceps', 'Lower Back'],
    equipment: ['Barbell'],
  },
  'Glute Kickbacks': {
    name: 'Glute Kickbacks',
    muscles: ['Glutes'],
    equipment: ['Cable Machine', 'Resistance Band'],
  },
  'Cable Glute Kickbacks': {
    name: 'Cable Glute Kickbacks',
    muscles: ['Glutes'],
    equipment: ['Cable Machine', 'Ankle Strap'],
  },
  'Clamshells': {
    name: 'Clamshells',
    muscles: ['Glutes'],
    equipment: ['Resistance Band'],
  },
  'Fire Hydrants': {
    name: 'Fire Hydrants',
    muscles: ['Glutes'],
    equipment: ['Body Weight'],
  },
  'Frog Pumps': {
    name: 'Frog Pumps',
    muscles: ['Glutes'],
    equipment: ['Body Weight'],
  },

  // ============================================================================
  // LEG EXERCISES - CALVES
  // ============================================================================

  'Calf Raises': {
    name: 'Calf Raises',
    muscles: ['Calves'],
    equipment: ['Calf Raise Machine', 'Body Weight'],
  },
  'Standing Calf Raises': {
    name: 'Standing Calf Raises',
    muscles: ['Calves'],
    equipment: ['Calf Raise Machine', 'Dumbbells'],
  },
  'Seated Calf Raises': {
    name: 'Seated Calf Raises',
    muscles: ['Calves'],
    equipment: ['Machine', 'Dumbbells'],
  },
  'Single-Leg Calf Raises': {
    name: 'Single-Leg Calf Raises',
    muscles: ['Calves'],
    equipment: ['Body Weight', 'Dumbbells'],
  },
  'Donkey Calf Raises': {
    name: 'Donkey Calf Raises',
    muscles: ['Calves'],
    equipment: ['Machine'],
  },

  // ============================================================================
  // LEG EXERCISES - ADDUCTORS & ABDUCTORS
  // ============================================================================
  'Hip Adductions': {
    name: 'Hip Adductions',
    muscles: ['Adductors'],
    equipment: ['Hip Adductor Machine'],
  },
  'Hip Abductions': {
    name: 'Hip Abductions',
    muscles: ['Abductors'],
    equipment: ['Hip Abductor Machine'],
  },

  // ============================================================================
  // CORE EXERCISES
  // ============================================================================

  // Compound Core
  'Planks': {
    name: 'Planks',
    muscles: ['Core', 'Obliques'],
    equipment: ['Body Weight'],
  },
  'Side Planks': {
    name: 'Side Planks',
    muscles: ['Core', 'Obliques'],
    equipment: ['Body Weight'],
  },
  'Dead Bug': {
    name: 'Dead Bug',
    muscles: ['Core'],
    equipment: ['Body Weight'],
  },
  'Bird Dog': {
    name: 'Bird Dog',
    muscles: ['Core', 'Lower Back'],
    equipment: ['Body Weight'],
  },
  'Mountain Climbers': {
    name: 'Mountain Climbers',
    muscles: ['Core', 'Shoulders'],
    equipment: ['Body Weight'],
  },

  // Flexion-Based Core
  'Crunches': {
    name: 'Crunches',
    muscles: ['Core', 'Obliques'],
    equipment: ['Body Weight'],
  },
  'Sit-Ups': {
    name: 'Sit-Ups',
    muscles: ['Core', 'Hip Flexors', 'Obliques'],
    equipment: ['Body Weight'],
  },
  'Bicycle Crunches': {
    name: 'Bicycle Crunches',
    muscles: ['Core', 'Obliques'],
    equipment: ['Body Weight'],
  },
  'Russian Twists': {
    name: 'Russian Twists',
    muscles: ['Core', 'Obliques'],
    equipment: ['Body Weight', 'Medicine Ball'],
  },
  'Cable Crunches': {
    name: 'Cable Crunches',
    muscles: ['Core', 'Obliques'],
    equipment: ['Cable Machine', 'Rope Attachment'],
  },
  'Ab Wheel Rollouts': {
    name: 'Ab Wheel Rollouts',
    muscles: ['Core'],
    equipment: ['Ab Wheel'],
  },
  'Ab Crunch Machine': {
    name: 'Ab Crunch Machine',
    muscles: ['Core', 'Obliques'],
    equipment: ['Ab Crunch Machine'],
  },

  // Hanging Core
  'Hanging Leg Raises': {
    name: 'Hanging Leg Raises',
    muscles: ['Core', 'Hip Flexors'],
    equipment: ['Pull-up Bar'],
  },
  'Hanging Knee Raises': {
    name: 'Hanging Knee Raises',
    muscles: ['Core', 'Hip Flexors'],
    equipment: ['Pull-up Bar'],
  },
  'Toes to Bar': {
    name: 'Toes to Bar',
    muscles: ['Core', 'Hip Flexors'],
    equipment: ['Pull-up Bar'],
  },
  'Captain\'s Chair Leg Raises': {
    name: 'Captain\'s Chair Leg Raises',
    muscles: ['Core', 'Hip Flexors'],
    equipment: ['Captain\'s Chair'],
  },

  // Rotational Core
  'Wood Chops': {
    name: 'Wood Chops',
    muscles: ['Core'],
    equipment: ['Cable Machine', 'Medicine Ball', 'D-Handle'],
  },
  'Pallof Press': {
    name: 'Pallof Press',
    muscles: ['Core'],
    equipment: ['Cable Machine', 'Resistance Band', 'D-Handle'],
  },

  // ============================================================================
  // FOREARM EXERCISES
  // ============================================================================

  'Wrist Curls': {
    name: 'Wrist Curls',
    muscles: ['Forearms'],
    equipment: ['Dumbbells', 'Barbell'],
  },
  'Reverse Wrist Curls': {
    name: 'Reverse Wrist Curls',
    muscles: ['Forearms'],
    equipment: ['Dumbbells', 'Barbell'],
  },
  'Farmer\'s Walk': {
    name: 'Farmer\'s Walk',
    muscles: ['Forearms', 'Traps', 'Core'],
    equipment: ['Dumbbells', 'Kettlebell'],
  },
  'Plate Pinches': {
    name: 'Plate Pinches',
    muscles: ['Forearms'],
    equipment: ['Weight Plates'],
  },
  'Grip Crushers': {
    name: 'Grip Crushers',
    muscles: ['Forearms'],
    equipment: ['Grip Trainer'],
  },

  // ============================================================================
  // LOWER BACK EXERCISES
  // ============================================================================

  'Deadlifts': {
    name: 'Deadlifts',
    muscles: ['Lower Back', 'Hamstrings', 'Glutes', 'Traps'],
    equipment: ['Barbell', 'Olympic Barbell'],
  },
  'Conventional Deadlifts': {
    name: 'Conventional Deadlifts',
    muscles: ['Lower Back', 'Hamstrings', 'Glutes', 'Traps'],
    equipment: ['Olympic Barbell'],
  },
  'Trap Bar Deadlifts': {
    name: 'Trap Bar Deadlifts',
    muscles: ['Lower Back', 'Hamstrings', 'Glutes', 'Quadriceps'],
    equipment: ['Trap Bar'],
  },
  'Back Extensions': {
    name: 'Back Extensions',
    muscles: ['Lower Back', 'Glutes'],
    equipment: ['Roman Chair', 'Body Weight'],
  },
  'Hyperextensions': {
    name: 'Hyperextensions',
    muscles: ['Lower Back', 'Glutes', 'Hamstrings'],
    equipment: ['Roman Chair'],
  },
  'Superman': {
    name: 'Superman',
    muscles: ['Lower Back', 'Glutes'],
    equipment: ['Body Weight'],
  },
  'Reverse Hyper': {
    name: 'Reverse Hyper',
    muscles: ['Glutes', 'Lower Back'],
    equipment: ['Reverse Hyper Machine'],
  },

  // ============================================================================
  // FULL BODY / FUNCTIONAL EXERCISES
  // ============================================================================

  'Burpees': {
    name: 'Burpees',
    muscles: ['Core', 'Chest', 'Shoulders', 'Quadriceps'],
    equipment: ['Body Weight'],
  },
  'Thrusters': {
    name: 'Thrusters',
    muscles: ['Shoulders', 'Quadriceps', 'Glutes', 'Core'],
    equipment: ['Dumbbells', 'Barbell'],
  },
  'Turkish Get-Ups': {
    name: 'Turkish Get-Ups',
    muscles: ['Core', 'Shoulders', 'Glutes'],
    equipment: ['Kettlebell', 'Dumbbells'],
  },
  'Clean and Press': {
    name: 'Clean and Press',
    muscles: ['Shoulders', 'Traps', 'Core', 'Quadriceps'],
    equipment: ['Barbell', 'Dumbbells'],
  },
  'Kettlebell Swings': {
    name: 'Kettlebell Swings',
    muscles: ['Glutes', 'Hamstrings', 'Core', 'Shoulders'],
    equipment: ['Kettlebell'],
  },
  'Battle Ropes': {
    name: 'Battle Ropes',
    muscles: ['Shoulders', 'Core', 'Forearms'],
    equipment: ['Battle Ropes'],
  },
  'Box Jumps': {
    name: 'Box Jumps',
    muscles: ['Quadriceps', 'Glutes', 'Calves'],
    equipment: ['Plyometric Box'],
  },
  'Wall Sits': {
    name: 'Wall Sits',
    muscles: ['Quadriceps', 'Glutes'],
    equipment: ['Body Weight'],
  },
  'Machine Rows': {
    name: 'Machine Rows',
    muscles: ['Upper Back', 'Lats', 'Biceps'],
    equipment: ['Rowing Machine'],
  },

  // ============================================================================
  // FUNCTIONAL TRAINING EXERCISES
  // ============================================================================

  'Medicine Ball Slams': {
    name: 'Medicine Ball Slams',
    muscles: ['Core', 'Shoulders', 'Upper Back'],
    equipment: ['Slam Ball'],
  },
  'Medicine Ball Throws': {
    name: 'Medicine Ball Throws',
    muscles: ['Core', 'Shoulders', 'Chest'],
    equipment: ['Medicine Ball'],
  },
  'Tire Flips': {
    name: 'Tire Flips',
    muscles: ['Quadriceps', 'Glutes', 'Upper Back', 'Core'],
    equipment: ['Tire'],
  },
  'Sledgehammer Swings': {
    name: 'Sledgehammer Swings',
    muscles: ['Core', 'Shoulders', 'Upper Back'],
    equipment: ['Sledgehammer', 'Tire'],
  },
  'Sled Push': {
    name: 'Sled Push',
    muscles: ['Quadriceps', 'Glutes', 'Core', 'Shoulders'],
    equipment: ['Prowler Sled'],
  },
  'Sled Pull': {
    name: 'Sled Pull',
    muscles: ['Upper Back', 'Biceps', 'Core'],
    equipment: ['Prowler Sled'],
  },
  'Weighted Chains Squats': {
    name: 'Weighted Chains Squats',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['Barbell', 'Chains'],
  },
  'Sandbag Carries': {
    name: 'Sandbag Carries',
    muscles: ['Core', 'Traps', 'Forearms'],
    equipment: ['Sandbag'],
  },
  'Sandbag Squats': {
    name: 'Sandbag Squats',
    muscles: ['Quadriceps', 'Glutes', 'Core'],
    equipment: ['Sandbag'],
  },

  // ============================================================================
  // CARDIO EXERCISES
  // ============================================================================

  'Treadmill Running': {
    name: 'Treadmill Running',
    muscles: ['Quadriceps', 'Hamstrings', 'Calves', 'Glutes'],
    equipment: ['Treadmill'],
    exerciseType: 'cardio',
  },
  'Outdoor Running': {
    name: 'Outdoor Running',
    muscles: ['Quadriceps', 'Hamstrings', 'Calves', 'Glutes'],
    equipment: ['None'],
    exerciseType: 'cardio',
  },
  'Stationary Bike': {
    name: 'Stationary Bike',
    muscles: ['Quadriceps', 'Hamstrings', 'Calves'],
    equipment: ['Stationary Bike'],
    exerciseType: 'cardio',
  },
  'Outdoor Cycling': {
    name: 'Outdoor Cycling',
    muscles: ['Quadriceps', 'Hamstrings', 'Calves', 'Glutes'],
    equipment: ['Bicycle'],
    exerciseType: 'cardio',
  },
  'Rowing Machine': {
    name: 'Rowing Machine',
    muscles: ['Back', 'Biceps', 'Legs', 'Core'],
    equipment: ['Rowing Machine'],
    exerciseType: 'cardio',
  },
  'Elliptical': {
    name: 'Elliptical',
    muscles: ['Quadriceps', 'Hamstrings', 'Glutes', 'Core'],
    equipment: ['Elliptical'],
    exerciseType: 'cardio',
  },
  'Stair Climber': {
    name: 'Stair Climber',
    muscles: ['Quadriceps', 'Glutes', 'Calves'],
    equipment: ['Stair Climber'],
    exerciseType: 'cardio',
  },
  'Jump Rope': {
    name: 'Jump Rope',
    muscles: ['Calves', 'Shoulders', 'Core'],
    equipment: ['Jump Rope'],
    exerciseType: 'cardio',
  },
  'Swimming': {
    name: 'Swimming',
    muscles: ['Back', 'Shoulders', 'Core', 'Legs'],
    equipment: ['Pool'],
    exerciseType: 'cardio',
  },
  'Battle Ropes (Cardio)': {
    name: 'Battle Ropes (Cardio)',
    muscles: ['Shoulders', 'Arms', 'Core'],
    equipment: ['Battle Ropes'],
    exerciseType: 'cardio',
  },
  'Box Jumps (Cardio)': {
    name: 'Box Jumps (Cardio)',
    muscles: ['Quadriceps', 'Glutes', 'Calves'],
    equipment: ['Plyo Box'],
    exerciseType: 'cardio',
  },
  'Burpees (Cardio)': {
    name: 'Burpees (Cardio)',
    muscles: ['Full Body'],
    equipment: ['Bodyweight'],
    exerciseType: 'cardio',
  },
  'Mountain Climbers (Cardio)': {
    name: 'Mountain Climbers (Cardio)',
    muscles: ['Core', 'Shoulders', 'Quadriceps'],
    equipment: ['Bodyweight'],
    exerciseType: 'cardio',
  },
  'Jumping Jacks': {
    name: 'Jumping Jacks',
    muscles: ['Full Body'],
    equipment: ['Bodyweight'],
    exerciseType: 'cardio',
  },
  'High Knees': {
    name: 'High Knees',
    muscles: ['Quadriceps', 'Hip Flexors', 'Core'],
    equipment: ['Bodyweight'],
    exerciseType: 'cardio',
  },
  'Sled Push (Cardio)': {
    name: 'Sled Push (Cardio)',
    muscles: ['Quadriceps', 'Glutes', 'Core'],
    equipment: ['Sled'],
    exerciseType: 'cardio',
  },
  'Assault Bike': {
    name: 'Assault Bike',
    muscles: ['Full Body'],
    equipment: ['Assault Bike'],
    exerciseType: 'cardio',
  },
  'Ski Erg': {
    name: 'Ski Erg',
    muscles: ['Back', 'Triceps', 'Core'],
    equipment: ['Ski Erg'],
    exerciseType: 'cardio',
  },
  'Walking Lunges (Cardio)': {
    name: 'Walking Lunges (Cardio)',
    muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    equipment: ['Bodyweight'],
    exerciseType: 'cardio',
  },
  'Sprint Intervals': {
    name: 'Sprint Intervals',
    muscles: ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves'],
    equipment: ['None'],
    exerciseType: 'cardio',
  },
} as const;
