export type MuscleGroup =
  | 'Chest'
  | 'Triceps'
  | 'Front Deltoids'
  | 'Side Deltoids'
  | 'Rear Deltoids'
  | 'Biceps'
  | 'Upper Back'
  | 'Lower Back'
  | 'Lats'
  | 'Traps'
  | 'Quadriceps'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Core'
  | 'Hip Flexors'
  | 'Adductors'
  | 'Abductors'
  | 'Obliques'
  | 'Forearms'
  | 'Upper Chest'
  | 'Shoulders'
  | 'Rotator Cuff'

  // Broad groups. Cardio and full-body movements genuinely don't decompose
  // into a specific head — "Swimming works your lats" is less true than
  // "Swimming works your back" — so these are first-class rather than being
  // forced into a more precise bucket.
  | 'Back'
  | 'Arms'
  | 'Legs'
  | 'Full Body'

  // Specific muscles referenced by the library but previously missing here,
  // which meant those exercises were invisible to muscle-group filters.
  | 'Brachialis';

// This array can be useful for iteration, filtering, etc.
export const muscleGroups: MuscleGroup[] = [
  'Chest',
  'Triceps',
  'Front Deltoids',
  'Side Deltoids',
  'Rear Deltoids',
  'Biceps',
  'Upper Back',
  'Lower Back',
  'Lats',
  'Traps',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Hip Flexors',
  'Adductors',
  'Abductors',
  'Obliques',
  'Forearms',
  'Upper Chest',
  'Shoulders',
  'Rotator Cuff',
  'Back',
  'Arms',
  'Legs',
  'Full Body',
  'Brachialis',
];
