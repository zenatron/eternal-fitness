export interface DashboardTileConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  order: number;
  component: string; // Component name to render
}

export interface DashboardConfig {
  tiles: DashboardTileConfig[];
  layout: 'grid' | 'list';
  theme: 'default' | 'compact';
}

// Default dashboard configuration
export const DEFAULT_DASHBOARD_TILES: DashboardTileConfig[] = [
  {
    id: 'streak',
    name: 'Workout Streak',
    description: 'Your current workout streak and activity calendar',
    enabled: true,
    order: 0,
    component: 'StreakCard',
  },
  {
    id: 'progress',
    name: 'Progress Overview',
    description: 'Workouts completed and weight progress',
    enabled: true,
    order: 1,
    component: 'ProgressCard',
  },
  {
    id: 'recent-activity',
    name: 'Recent Activity',
    description: 'Your latest workout sessions',
    enabled: true,
    order: 2,
    component: 'RecentActivityCard',
  },
  {
    id: 'upcoming-workouts',
    name: 'Upcoming Workouts',
    description: 'Scheduled workout sessions',
    enabled: true,
    order: 3,
    component: 'UpcomingWorkoutsCard',
  },
  {
    id: 'stats',
    name: 'Statistics',
    description: 'Training statistics and metrics',
    enabled: true,
    order: 4,
    component: 'StatsCard',
  },
  {
    id: 'quick-actions',
    name: 'Quick Actions',
    description: 'Shortcuts to common actions',
    enabled: true,
    order: 5,
    component: 'QuickActionsCard',
  },
];

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  tiles: DEFAULT_DASHBOARD_TILES,
  layout: 'grid',
  theme: 'default',
};
