export interface Achievement {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  tier: AchievementTier;
  requirement: number;
  icon: string;
  color: string;
  unlockedAt?: string;
}

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
  | 'dedication';

export type AchievementTier = 
  | 'bronze'
  | 'silver' 
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'legendary';

export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  // Volume Lifted Achievements
  {
    id: 'volume_bronze',
    category: 'volume_lifted',
    name: 'Getting Started',
    description: 'Lift 10,000 lbs total volume',
    tier: 'bronze',
    requirement: 10000,
    icon: '🏋️‍♂️',
    color: 'text-amber-600'
  },
  {
    id: 'volume_silver',
    category: 'volume_lifted',
    name: 'Strong Foundation',
    description: 'Lift 100,000 lbs total volume',
    tier: 'silver',
    requirement: 100000,
    icon: '💪',
    color: 'text-gray-500'
  },
  {
    id: 'volume_gold',
    category: 'volume_lifted',
    name: 'Power Lifter',
    description: 'Lift 1,000,000 lbs total volume',
    tier: 'gold',
    requirement: 1000000,
    icon: '🏆',
    color: 'text-yellow-500'
  },
  {
    id: 'volume_platinum',
    category: 'volume_lifted',
    name: 'Volume Master',
    description: 'Lift 10,000,000 lbs total volume',
    tier: 'platinum',
    requirement: 10000000,
    icon: '💎',
    color: 'text-blue-400'
  },
  {
    id: 'volume_diamond',
    category: 'volume_lifted',
    name: 'Legendary Lifter',
    description: 'Lift 100,000,000 lbs total volume',
    tier: 'diamond',
    requirement: 100000000,
    icon: '👑',
    color: 'text-purple-500'
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
    color: 'text-amber-600'
  },
  {
    id: 'workouts_silver',
    category: 'workouts_completed',
    name: 'Building Habits',
    description: 'Complete 25 workouts',
    tier: 'silver',
    requirement: 25,
    icon: '📈',
    color: 'text-gray-500'
  },
  {
    id: 'workouts_gold',
    category: 'workouts_completed',
    name: 'Fitness Enthusiast',
    description: 'Complete 100 workouts',
    tier: 'gold',
    requirement: 100,
    icon: '🔥',
    color: 'text-yellow-500'
  },
  {
    id: 'workouts_platinum',
    category: 'workouts_completed',
    name: 'Workout Warrior',
    description: 'Complete 500 workouts',
    tier: 'platinum',
    requirement: 500,
    icon: '⚡',
    color: 'text-blue-400'
  },
  {
    id: 'workouts_diamond',
    category: 'workouts_completed',
    name: 'Training Legend',
    description: 'Complete 1,000 workouts',
    tier: 'diamond',
    requirement: 1000,
    icon: '🌟',
    color: 'text-purple-500'
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
    color: 'text-amber-600'
  },
  {
    id: 'exercises_silver',
    category: 'unique_exercises',
    name: 'Variety Seeker',
    description: 'Try 15 different exercises',
    tier: 'silver',
    requirement: 15,
    icon: '🎪',
    color: 'text-gray-500'
  },
  {
    id: 'exercises_gold',
    category: 'unique_exercises',
    name: 'Movement Master',
    description: 'Try 30 different exercises',
    tier: 'gold',
    requirement: 30,
    icon: '🤸‍♂️',
    color: 'text-yellow-500'
  },
  {
    id: 'exercises_platinum',
    category: 'unique_exercises',
    name: 'Exercise Encyclopedia',
    description: 'Try 75 different exercises',
    tier: 'platinum',
    requirement: 75,
    icon: '📚',
    color: 'text-blue-400'
  },
  {
    id: 'exercises_diamond',
    category: 'unique_exercises',
    name: 'Ultimate Athlete',
    description: 'Try 100 different exercises',
    tier: 'diamond',
    requirement: 100,
    icon: '🏅',
    color: 'text-purple-500'
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
    color: 'text-amber-600'
  },
  {
    id: 'hours_silver',
    category: 'workout_hours',
    name: 'Time Investor',
    description: 'Work out for 50 total hours',
    tier: 'silver',
    requirement: 50,
    icon: '⏳',
    color: 'text-gray-500'
  },
  {
    id: 'hours_gold',
    category: 'workout_hours',
    name: 'Time Dedicated',
    description: 'Work out for 200 total hours',
    tier: 'gold',
    requirement: 200,
    icon: '🕐',
    color: 'text-yellow-500'
  },
  {
    id: 'hours_platinum',
    category: 'workout_hours',
    name: 'Time Master',
    description: 'Work out for 500 total hours',
    tier: 'platinum',
    requirement: 500,
    icon: '⌚',
    color: 'text-blue-400'
  },
  {
    id: 'hours_diamond',
    category: 'workout_hours',
    name: 'Time Legend',
    description: 'Work out for 1,000 total hours',
    tier: 'diamond',
    requirement: 1000,
    icon: '🕰️',
    color: 'text-purple-500'
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
    color: 'text-amber-600'
  },
  {
    id: 'streak_silver',
    category: 'consistency_streak',
    name: 'Week Warrior',
    description: 'Maintain a 7-day workout streak',
    tier: 'silver',
    requirement: 7,
    icon: '🗓️',
    color: 'text-gray-500'
  },
  {
    id: 'streak_gold',
    category: 'consistency_streak',
    name: 'Month Master',
    description: 'Maintain a 30-day workout streak',
    tier: 'gold',
    requirement: 30,
    icon: '🔗',
    color: 'text-yellow-500'
  },
  {
    id: 'streak_platinum',
    category: 'consistency_streak',
    name: 'Unstoppable Force',
    description: 'Maintain a 100-day workout streak',
    tier: 'platinum',
    requirement: 100,
    icon: '🚀',
    color: 'text-blue-400'
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
    color: 'text-amber-600'
  },
  {
    id: 'prs_silver',
    category: 'personal_records',
    name: 'Progress Tracker',
    description: 'Set 50 personal records',
    tier: 'silver',
    requirement: 50,
    icon: '📈',
    color: 'text-gray-500'
  },
  {
    id: 'prs_gold',
    category: 'personal_records',
    name: 'PR Machine',
    description: 'Set 100 personal records',
    tier: 'gold',
    requirement: 100,
    icon: '🎖️',
    color: 'text-yellow-500'
  }
];

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
