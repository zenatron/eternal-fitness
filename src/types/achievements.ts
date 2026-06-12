export interface Achievement {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  tier: AchievementTier;
  requirement: number;
  icon: string;
  color: string;
  points: number;
  unlockedAt?: string;
  imperialDescription?: string;
  imperialRequirement?: number;
}

export const TIER_POINTS: Record<AchievementTier, number> = {
  bronze: 50,
  silver: 100,
  gold: 250,
  platinum: 500,
  diamond: 1000,
  legendary: 2500,
};

export interface UserAchievements {
  unlockedAchievements: string[]; // Array of achievement IDs
  progress: Record<string, number>; // Current progress for each category
  lastUpdated: string;
}

export type AchievementCategory =
  | 'volume_lifted'
  | 'workouts_completed'
  | 'unique_exercises'
  | 'workout_hours'
  | 'consistency_streak'
  | 'personal_records'
  | 'heavy_lifter'
  | 'endurance'
  | 'dedication'
  | 'early_bird'
  | 'night_owl'
  | 'template_mastery'
  | 'monthly_warrior'
  | 'total_distance'
  | 'cardio_sessions'
  | 'cardio_duration';

export const CATEGORY_NAMES: Record<AchievementCategory, string> = {
  volume_lifted: 'Volume Lifted',
  workouts_completed: 'Workouts Completed',
  unique_exercises: 'Unique Exercises',
  workout_hours: 'Workout Hours',
  consistency_streak: 'Consistency Streak',
  personal_records: 'Personal Records',
  heavy_lifter: 'Heavy Lifter',
  endurance: 'Endurance',
  dedication: 'Dedication',
  early_bird: 'Early Bird',
  night_owl: 'Night Owl',
  template_mastery: 'Template Mastery',
  monthly_warrior: 'Monthly Warrior',
  total_distance: 'Total Distance',
  cardio_sessions: 'Cardio Sessions',
  cardio_duration: 'Cardio Duration',
};

export type AchievementTier = 
  | 'bronze'
  | 'silver' 
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'legendary';

export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  // Volume Lifted Achievements — requirement in user's weight unit (lbs or kg)
  {
    id: 'volume_bronze',
    category: 'volume_lifted',
    name: 'Getting Started',
    description: 'Lift 10,000 kg total volume',
    tier: 'bronze',
    requirement: 10000,
    imperialDescription: 'Lift 10,000 lbs total volume',
    icon: '🏋️‍♂️',
    color: 'text-amber-600',
    points: 50,
  },
  {
    id: 'volume_silver',
    category: 'volume_lifted',
    name: 'Strong Foundation',
    description: 'Lift 100,000 kg total volume',
    tier: 'silver',
    requirement: 100000,
    imperialDescription: 'Lift 100,000 lbs total volume',
    icon: '💪',
    color: 'text-gray-500',
    points: 100,
  },
  {
    id: 'volume_gold',
    category: 'volume_lifted',
    name: 'Power Lifter',
    description: 'Lift 1,000,000 kg total volume',
    tier: 'gold',
    requirement: 1000000,
    imperialDescription: 'Lift 1,000,000 lbs total volume',
    icon: '🏆',
    color: 'text-yellow-500',
    points: 250,
  },
  {
    id: 'volume_platinum',
    category: 'volume_lifted',
    name: 'Volume Master',
    description: 'Lift 10,000,000 kg total volume',
    tier: 'platinum',
    requirement: 10000000,
    imperialDescription: 'Lift 10,000,000 lbs total volume',
    icon: '💎',
    color: 'text-blue-400',
    points: 500,
  },
  {
    id: 'volume_diamond',
    category: 'volume_lifted',
    name: 'Legendary Lifter',
    description: 'Lift 100,000,000 kg total volume',
    tier: 'diamond',
    requirement: 100000000,
    imperialDescription: 'Lift 100,000,000 lbs total volume',
    icon: '👑',
    color: 'text-purple-500',
    points: 1000,
  },

  // Workouts Completed
  {
    id: 'workouts_bronze',
    category: 'workouts_completed',
    name: 'First Steps',
    description: 'Complete 5 workouts',
    tier: 'bronze',
    requirement: 5,
    icon: '🎯',
    color: 'text-amber-600',
    points: 50,
  },
  {
    id: 'workouts_silver',
    category: 'workouts_completed',
    name: 'Building Habits',
    description: 'Complete 25 workouts',
    tier: 'silver',
    requirement: 25,
    icon: '📈',
    color: 'text-gray-500',
    points: 100,
  },
  {
    id: 'workouts_gold',
    category: 'workouts_completed',
    name: 'Fitness Enthusiast',
    description: 'Complete 100 workouts',
    tier: 'gold',
    requirement: 100,
    icon: '🔥',
    color: 'text-yellow-500',
    points: 250,
  },
  {
    id: 'workouts_platinum',
    category: 'workouts_completed',
    name: 'Workout Warrior',
    description: 'Complete 500 workouts',
    tier: 'platinum',
    requirement: 500,
    icon: '⚡',
    color: 'text-blue-400',
    points: 500,
  },
  {
    id: 'workouts_diamond',
    category: 'workouts_completed',
    name: 'Training Legend',
    description: 'Complete 1,000 workouts',
    tier: 'diamond',
    requirement: 1000,
    icon: '🌟',
    color: 'text-purple-500',
    points: 1000,
  },

  // Unique Exercises
  {
    id: 'exercises_bronze',
    category: 'unique_exercises',
    name: 'Explorer',
    description: 'Try 5 different exercises',
    tier: 'bronze',
    requirement: 5,
    icon: '🧭',
    color: 'text-amber-600',
    points: 50,
  },
  {
    id: 'exercises_silver',
    category: 'unique_exercises',
    name: 'Variety Seeker',
    description: 'Try 15 different exercises',
    tier: 'silver',
    requirement: 15,
    icon: '🎪',
    color: 'text-gray-500',
    points: 100,
  },
  {
    id: 'exercises_gold',
    category: 'unique_exercises',
    name: 'Movement Master',
    description: 'Try 30 different exercises',
    tier: 'gold',
    requirement: 30,
    icon: '🤸‍♂️',
    color: 'text-yellow-500',
    points: 250,
  },
  {
    id: 'exercises_platinum',
    category: 'unique_exercises',
    name: 'Exercise Encyclopedia',
    description: 'Try 75 different exercises',
    tier: 'platinum',
    requirement: 75,
    icon: '📚',
    color: 'text-blue-400',
    points: 500,
  },
  {
    id: 'exercises_diamond',
    category: 'unique_exercises',
    name: 'Ultimate Athlete',
    description: 'Try 100 different exercises',
    tier: 'diamond',
    requirement: 100,
    icon: '🏅',
    color: 'text-purple-500',
    points: 1000,
  },

  // Workout Hours
  {
    id: 'hours_bronze',
    category: 'workout_hours',
    name: 'Time Starter',
    description: 'Work out for 10 total hours',
    tier: 'bronze',
    requirement: 10,
    icon: '⏰',
    color: 'text-amber-600',
    points: 50,
  },
  {
    id: 'hours_silver',
    category: 'workout_hours',
    name: 'Time Investor',
    description: 'Work out for 50 total hours',
    tier: 'silver',
    requirement: 50,
    icon: '⏳',
    color: 'text-gray-500',
    points: 100,
  },
  {
    id: 'hours_gold',
    category: 'workout_hours',
    name: 'Time Dedicated',
    description: 'Work out for 200 total hours',
    tier: 'gold',
    requirement: 200,
    icon: '🕐',
    color: 'text-yellow-500',
    points: 250,
  },
  {
    id: 'hours_platinum',
    category: 'workout_hours',
    name: 'Time Master',
    description: 'Work out for 500 total hours',
    tier: 'platinum',
    requirement: 500,
    icon: '⌚',
    color: 'text-blue-400',
    points: 500,
  },
  {
    id: 'hours_diamond',
    category: 'workout_hours',
    name: 'Time Legend',
    description: 'Work out for 1,000 total hours',
    tier: 'diamond',
    requirement: 1000,
    icon: '🕰️',
    color: 'text-purple-500',
    points: 1000,
  },

  // Consistency Streak
  {
    id: 'streak_bronze',
    category: 'consistency_streak',
    name: 'Consistent Start',
    description: 'Maintain a 3-day workout streak',
    tier: 'bronze',
    requirement: 3,
    icon: '📅',
    color: 'text-amber-600',
    points: 50,
  },
  {
    id: 'streak_silver',
    category: 'consistency_streak',
    name: 'Week Warrior',
    description: 'Maintain a 7-day workout streak',
    tier: 'silver',
    requirement: 7,
    icon: '🗓️',
    color: 'text-gray-500',
    points: 100,
  },
  {
    id: 'streak_gold',
    category: 'consistency_streak',
    name: 'Month Master',
    description: 'Maintain a 30-day workout streak',
    tier: 'gold',
    requirement: 30,
    icon: '🔗',
    color: 'text-yellow-500',
    points: 250,
  },
  {
    id: 'streak_platinum',
    category: 'consistency_streak',
    name: 'Unstoppable Force',
    description: 'Maintain a 100-day workout streak',
    tier: 'platinum',
    requirement: 100,
    icon: '🚀',
    color: 'text-blue-400',
    points: 500,
  },

  // Personal Records
  {
    id: 'prs_bronze',
    category: 'personal_records',
    name: 'Record Setter',
    description: 'Set 25 personal records',
    tier: 'bronze',
    requirement: 25,
    icon: '📊',
    color: 'text-amber-600',
    points: 50,
  },
  {
    id: 'prs_silver',
    category: 'personal_records',
    name: 'Progress Tracker',
    description: 'Set 50 personal records',
    tier: 'silver',
    requirement: 50,
    icon: '📈',
    color: 'text-gray-500',
    points: 100,
  },
  {
    id: 'prs_gold',
    category: 'personal_records',
    name: 'PR Machine',
    description: 'Set 100 personal records',
    tier: 'gold',
    requirement: 100,
    icon: '🎖️',
    color: 'text-yellow-500',
    points: 250,
  },

  // Early Bird - workouts completed before 8am
  {
    id: 'early_bird_bronze',
    category: 'early_bird',
    name: 'Dawn Riser',
    description: 'Complete 5 workouts before 8 AM',
    tier: 'bronze',
    requirement: 5,
    icon: '🌅',
    color: 'text-amber-600',
    points: 50,
  },
  {
    id: 'early_bird_silver',
    category: 'early_bird',
    name: 'Morning Regular',
    description: 'Complete 15 workouts before 8 AM',
    tier: 'silver',
    requirement: 15,
    icon: '🌄',
    color: 'text-gray-500',
    points: 100,
  },
  {
    id: 'early_bird_gold',
    category: 'early_bird',
    name: 'Sunrise Warrior',
    description: 'Complete 50 workouts before 8 AM',
    tier: 'gold',
    requirement: 50,
    icon: '☀️',
    color: 'text-yellow-500',
    points: 250,
  },
  {
    id: 'early_bird_platinum',
    category: 'early_bird',
    name: 'Dawn Champion',
    description: 'Complete 100 workouts before 8 AM',
    tier: 'platinum',
    requirement: 100,
    icon: '🔆',
    color: 'text-blue-400',
    points: 500,
  },

  // Night Owl - workouts completed after 10pm
  {
    id: 'night_owl_bronze',
    category: 'night_owl',
    name: 'Late Lifter',
    description: 'Complete 5 workouts after 10 PM',
    tier: 'bronze',
    requirement: 5,
    icon: '🌙',
    color: 'text-amber-600',
    points: 50,
  },
  {
    id: 'night_owl_silver',
    category: 'night_owl',
    name: 'Night Regular',
    description: 'Complete 15 workouts after 10 PM',
    tier: 'silver',
    requirement: 15,
    icon: '🌜',
    color: 'text-gray-500',
    points: 100,
  },
  {
    id: 'night_owl_gold',
    category: 'night_owl',
    name: 'Midnight Grinder',
    description: 'Complete 50 workouts after 10 PM',
    tier: 'gold',
    requirement: 50,
    icon: '🦉',
    color: 'text-yellow-500',
    points: 250,
  },
  {
    id: 'night_owl_platinum',
    category: 'night_owl',
    name: 'Night Owl Legend',
    description: 'Complete 100 workouts after 10 PM',
    tier: 'platinum',
    requirement: 100,
    icon: '🌑',
    color: 'text-blue-400',
    points: 500,
  },

  // Template Mastery - completing the same template X times
  {
    id: 'template_mastery_bronze',
    category: 'template_mastery',
    name: 'Routine Builder',
    description: 'Complete the same template 5 times',
    tier: 'bronze',
    requirement: 5,
    icon: '📋',
    color: 'text-amber-600',
    points: 50,
  },
  {
    id: 'template_mastery_silver',
    category: 'template_mastery',
    name: 'Creature of Habit',
    description: 'Complete the same template 15 times',
    tier: 'silver',
    requirement: 15,
    icon: '📝',
    color: 'text-gray-500',
    points: 100,
  },
  {
    id: 'template_mastery_gold',
    category: 'template_mastery',
    name: 'Template Expert',
    description: 'Complete the same template 30 times',
    tier: 'gold',
    requirement: 30,
    icon: '🎓',
    color: 'text-yellow-500',
    points: 250,
  },
  {
    id: 'template_mastery_platinum',
    category: 'template_mastery',
    name: 'Routine Master',
    description: 'Complete the same template 50 times',
    tier: 'platinum',
    requirement: 50,
    icon: '🏛️',
    color: 'text-blue-400',
    points: 500,
  },

  // Monthly Warrior - workouts in a single calendar month
  {
    id: 'monthly_warrior_bronze',
    category: 'monthly_warrior',
    name: 'Monthly Starter',
    description: 'Complete 10 workouts in a single month',
    tier: 'bronze',
    requirement: 10,
    icon: '📆',
    color: 'text-amber-600',
    points: 50,
  },
  {
    id: 'monthly_warrior_silver',
    category: 'monthly_warrior',
    name: 'Dedicated Month',
    description: 'Complete 15 workouts in a single month',
    tier: 'silver',
    requirement: 15,
    icon: '🗓️',
    color: 'text-gray-500',
    points: 100,
  },
  {
    id: 'monthly_warrior_gold',
    category: 'monthly_warrior',
    name: 'Monthly Beast',
    description: 'Complete 20 workouts in a single month',
    tier: 'gold',
    requirement: 20,
    icon: '💥',
    color: 'text-yellow-500',
    points: 250,
  },
  {
    id: 'monthly_warrior_platinum',
    category: 'monthly_warrior',
    name: 'Iron Month',
    description: 'Complete 25 workouts in a single month',
    tier: 'platinum',
    requirement: 25,
    icon: '⚔️',
    color: 'text-blue-400',
    points: 500,
  },

  // Total Distance - total distance covered across all cardio workouts
  // Requirements in km (metric) / mi (imperial) — stored in user's display unit
  {
    id: 'distance_bronze',
    category: 'total_distance',
    name: 'First Mile',
    description: 'Cover 10 km total distance in cardio workouts',
    tier: 'bronze',
    requirement: 10,
    imperialDescription: 'Cover 10 mi total distance in cardio workouts',
    imperialRequirement: 10,
    icon: '🏃',
    color: 'text-amber-600',
    points: 50,
  },
  {
    id: 'distance_silver',
    category: 'total_distance',
    name: 'Road Runner',
    description: 'Cover 50 km total distance in cardio workouts',
    tier: 'silver',
    requirement: 50,
    imperialDescription: 'Cover 50 mi total distance in cardio workouts',
    imperialRequirement: 50,
    icon: '🏃‍♂️',
    color: 'text-gray-500',
    points: 100,
  },
  {
    id: 'distance_gold',
    category: 'total_distance',
    name: 'Marathon Runner',
    description: 'Cover 200 km total distance in cardio workouts',
    tier: 'gold',
    requirement: 200,
    imperialDescription: 'Cover 200 mi total distance in cardio workouts',
    imperialRequirement: 200,
    icon: '🏃‍♀️',
    color: 'text-yellow-500',
    points: 250,
  },
  {
    id: 'distance_platinum',
    category: 'total_distance',
    name: 'Ultra Runner',
    description: 'Cover 500 km total distance in cardio workouts',
    tier: 'platinum',
    requirement: 500,
    imperialDescription: 'Cover 500 mi total distance in cardio workouts',
    imperialRequirement: 500,
    icon: '🥇',
    color: 'text-blue-400',
    points: 500,
  },
  {
    id: 'distance_diamond',
    category: 'total_distance',
    name: 'Distance Legend',
    description: 'Cover 1,000 km total distance in cardio workouts',
    tier: 'diamond',
    requirement: 1000,
    imperialDescription: 'Cover 1,000 mi total distance in cardio workouts',
    imperialRequirement: 1000,
    icon: '🌍',
    color: 'text-purple-500',
    points: 1000,
  },

  // Cardio Sessions - total number of completed cardio workout sessions
  {
    id: 'cardio_sessions_bronze',
    category: 'cardio_sessions',
    name: 'Cardio Starter',
    description: 'Complete 5 cardio workout sessions',
    tier: 'bronze',
    requirement: 5,
    icon: '❤️',
    color: 'text-amber-600',
    points: 50,
  },
  {
    id: 'cardio_sessions_silver',
    category: 'cardio_sessions',
    name: 'Heart Pumper',
    description: 'Complete 25 cardio workout sessions',
    tier: 'silver',
    requirement: 25,
    icon: '💓',
    color: 'text-gray-500',
    points: 100,
  },
  {
    id: 'cardio_sessions_gold',
    category: 'cardio_sessions',
    name: 'Cardio Machine',
    description: 'Complete 75 cardio workout sessions',
    tier: 'gold',
    requirement: 75,
    icon: '💗',
    color: 'text-yellow-500',
    points: 250,
  },
  {
    id: 'cardio_sessions_platinum',
    category: 'cardio_sessions',
    name: 'Endurance King',
    description: 'Complete 150 cardio workout sessions',
    tier: 'platinum',
    requirement: 150,
    icon: '💖',
    color: 'text-blue-400',
    points: 500,
  },
  {
    id: 'cardio_sessions_diamond',
    category: 'cardio_sessions',
    name: 'Cardio Legend',
    description: 'Complete 300 cardio workout sessions',
    tier: 'diamond',
    requirement: 300,
    icon: '🫀',
    color: 'text-purple-500',
    points: 1000,
  },

  // Cardio Duration - total time spent on cardio exercises (requirement in hours)
  {
    id: 'cardio_duration_bronze',
    category: 'cardio_duration',
    name: 'Getting Moving',
    description: 'Spend 5 hours on cardio exercises',
    tier: 'bronze',
    requirement: 5,
    icon: '⏱️',
    color: 'text-amber-600',
    points: 50,
  },
  {
    id: 'cardio_duration_silver',
    category: 'cardio_duration',
    name: 'Sweat Session',
    description: 'Spend 25 hours on cardio exercises',
    tier: 'silver',
    requirement: 25,
    icon: '⏲️',
    color: 'text-gray-500',
    points: 100,
  },
  {
    id: 'cardio_duration_gold',
    category: 'cardio_duration',
    name: 'Cardio Devotee',
    description: 'Spend 100 hours on cardio exercises',
    tier: 'gold',
    requirement: 100,
    icon: '🕐',
    color: 'text-yellow-500',
    points: 250,
  },
  {
    id: 'cardio_duration_platinum',
    category: 'cardio_duration',
    name: 'Endurance Master',
    description: 'Spend 250 hours on cardio exercises',
    tier: 'platinum',
    requirement: 250,
    icon: '⌛',
    color: 'text-blue-400',
    points: 500,
  },
];

export function localizeAchievement(achievement: Achievement | { description: string; requirement: number; imperialDescription?: string; imperialRequirement?: number }, useMetric: boolean): { description: string; requirement: number } {
  if (useMetric) {
    return { description: achievement.description, requirement: achievement.requirement };
  }
  return {
    description: achievement.imperialDescription || achievement.description,
    requirement: achievement.imperialRequirement ?? achievement.requirement,
  };
}

export const TIER_COLORS = {
  bronze: 'from-amber-400 to-amber-600',
  silver: 'from-gray-400 to-gray-600', 
  gold: 'from-yellow-400 to-yellow-600',
  platinum: 'from-blue-400 to-blue-600',
  diamond: 'from-purple-400 to-purple-600',
  legendary: 'from-pink-400 to-pink-600'
};

export const TIER_NAMES = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold', 
  platinum: 'Platinum',
  diamond: 'Diamond',
  legendary: 'Legendary'
};
