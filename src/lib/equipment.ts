export type Equipment =
  // Free Weights
  | 'Barbell'
  | 'Dumbbells'
  | 'Kettlebell'
  | 'Weight Plates'
  | 'EZ-Curl Bar'
  | 'Olympic Barbell'
  | 'Trap Bar'

  // Benches & Racks
  | 'Bench'
  | 'Incline Bench'
  | 'Decline Bench'
  | 'Adjustable Bench'
  | 'Squat Rack'
  | 'Power Rack'
  | 'Smith Machine'
  | 'Preacher Bench'
  | 'Roman Chair'

  // Cable & Pulley Systems
  | 'Cable Machine'
  | 'Lat Pulldown Machine'
  | 'Cable Crossover'
  | 'Functional Trainer'
  | 'Pulley System'

  // Cardio Equipment (commonly used in strength training)
  | 'Rowing Machine'
  | 'Assault Bike'

  // Specialized Machines
  | 'Leg Press Machine'
  | 'Leg Curl Machine'
  | 'Leg Extension Machine'
  | 'Calf Raise Machine'
  | 'Hip Adductor Machine'
  | 'Hip Abductor Machine'
  | 'Ab Crunch Machine'
  | 'Chest Press Machine'
  | 'Shoulder Press Machine'
  | 'Pec Deck Machine'
  | 'Seated Row Machine'
  | 'T-Bar Machine'
  | 'Hip Thrust Machine'
  | 'Hack Squat Machine'
  | 'Machine'

  // Bodyweight & Suspension
  | 'Body Weight'
  | 'Pull-up Bar'
  | 'Dip Bars'
  | 'Parallel Bars'
  | 'TRX Suspension Trainer'
  | 'Gymnastic Rings'
  | 'Captain\'s Chair'

  // Functional Training
  | 'Resistance Band'
  | 'Battle Ropes'
  | 'Plyometric Box'
  | 'Box'
  | 'Medicine Ball'
  | 'Slam Ball'

  // Accessories & Tools
  | 'Bar'
  | 'Lat Bar'
  | 'V-Bar'
  | 'Rope Attachment'
  | 'D-Handle'
  | 'Ankle Strap'

  // Outdoor & Alternative
  | 'Sandbag'
  | 'Tire'
  | 'Sledgehammer'
  | 'Prowler Sled'
  | 'Chains'
  | 'Bands'

  // Additional Equipment
  | 'Ab Wheel'
  | 'Grip Trainer'

  // Cardio machines. The library has had cardio exercises for a while, but
  // their equipment was never added here, so they failed validation and were
  // missing from equipment filters.
  | 'Treadmill'
  | 'Stationary Bike'
  | 'Bicycle'
  | 'Elliptical'
  | 'Stair Climber'
  | 'Ski Erg'
  | 'Jump Rope'
  | 'Pool'

  // Specialist strength equipment
  | 'Landmine'
  | 'Belt Squat Machine'
  | 'GHD'
  | 'Reverse Hyper Machine'

  // For exercises that need nothing at all (outdoor running, sprints).
  | 'None';

// Array of all equipment for validation and iteration
export const equipment: Equipment[] = [
  // Free Weights
  'Barbell',
  'Dumbbells',
  'Kettlebell',
  'Weight Plates',
  'EZ-Curl Bar',
  'Olympic Barbell',
  'Trap Bar',

  // Benches & Racks
  'Bench',
  'Incline Bench',
  'Decline Bench',
  'Adjustable Bench',
  'Squat Rack',
  'Power Rack',
  'Smith Machine',
  'Preacher Bench',
  'Roman Chair',

  // Cable & Pulley Systems
  'Cable Machine',
  'Lat Pulldown Machine',
  'Cable Crossover',
  'Functional Trainer',
  'Pulley System',

  // Cardio Equipment (commonly used in strength training)
  'Rowing Machine',
  'Assault Bike',

  // Specialized Machines
  'Leg Press Machine',
  'Leg Curl Machine',
  'Leg Extension Machine',
  'Hip Adductor Machine',
  'Hip Abductor Machine',
  'Ab Crunch Machine',
  'Calf Raise Machine',
  'Chest Press Machine',
  'Shoulder Press Machine',
  'Pec Deck Machine',
  'Seated Row Machine',
  'T-Bar Machine',
  'Hip Thrust Machine',
  'Hack Squat Machine',
  'Machine',

  // Bodyweight & Suspension
  'Body Weight',
  'Pull-up Bar',
  'Dip Bars',
  'Parallel Bars',
  'TRX Suspension Trainer',
  'Gymnastic Rings',
  'Captain\'s Chair',

  // Functional Training
  'Resistance Band',
  'Battle Ropes',
  'Plyometric Box',
  'Box',
  'Medicine Ball',
  'Slam Ball',

  // Accessories & Tools
  'Bar',
  'Lat Bar',
  'V-Bar',
  'Rope Attachment',
  'D-Handle',
  'Ankle Strap',

  // Outdoor & Alternative
  'Sandbag',
  'Tire',
  'Sledgehammer',
  'Prowler Sled',
  'Chains',
  'Bands',

  // Additional Equipment
  'Ab Wheel',
  'Grip Trainer',

  // Cardio machines
  'Treadmill',
  'Stationary Bike',
  'Bicycle',
  'Elliptical',
  'Stair Climber',
  'Ski Erg',
  'Jump Rope',
  'Pool',

  // Specialist strength equipment
  'Landmine',
  'Belt Squat Machine',
  'GHD',
  'Reverse Hyper Machine',

  'None',
];