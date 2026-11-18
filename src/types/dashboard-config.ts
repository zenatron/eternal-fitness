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
    name: 'Streak',
    description: 'Days in a row, and the last four weeks',
    enabled: true,
    order: 0,
    component: 'StreakCard',
  },
  {
    id: 'progress',
    name: 'Progress',
    description: 'Workouts, records and your weight goal',
    enabled: true,
    order: 1,
    component: 'ProgressCard',
  },
  {
    id: 'recent-activity',
    name: 'Recent workouts',
    description: 'Your last few sessions',
    enabled: true,
    order: 2,
    component: 'RecentActivityCard',
  },
  {
    id: 'upcoming-workouts',
    name: 'Scheduled',
    description: 'Workouts you have planned',
    enabled: true,
    order: 3,
    component: 'UpcomingWorkoutsCard',
  },
  {
    id: 'stats',
    name: 'All time',
    description: 'Lifetime totals',
    enabled: true,
    order: 4,
    component: 'StatsCard',
  },
  {
    id: 'level',
    name: 'Level',
    description: 'XP and the next level',
    enabled: true,
    order: 5,
    component: 'LevelCard',
  },
  {
    id: 'quick-actions',
    name: 'Go to',
    description: 'Shortcuts to the rest of the app',
    enabled: true,
    order: 6,
    component: 'QuickActionsCard',
  },
  {
    id: 'strength',
    name: 'Strength',
    description: 'Lifts moving most, and any that have stalled',
    enabled: true,
    order: 7,
    component: 'StrengthCard',
  },
];

/**
 * A saved layout with any tiles added since it was saved.
 *
 * A config is stored whole, so without this a tile shipped after someone first
 * customised their home screen would never reach them — not even as an option
 * in the settings sheet. New tiles go at the end, on; names and descriptions
 * always come from the current defaults, so renaming a tile renames it for
 * everyone. Unknown ids (a tile since removed) are dropped.
 */
export function withDefaultTiles(config: DashboardConfig): DashboardConfig {
  const saved = new Map((config.tiles ?? []).map((t) => [t.id, t]));
  const maxOrder = Math.max(-1, ...(config.tiles ?? []).map((t) => t.order));
  let next = maxOrder + 1;
  const tiles = DEFAULT_DASHBOARD_TILES.map((def) => {
    const mine = saved.get(def.id);
    return mine
      ? { ...def, enabled: mine.enabled, order: mine.order }
      : { ...def, order: next++ };
  });
  return { ...DEFAULT_DASHBOARD_CONFIG, ...config, tiles };
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  tiles: DEFAULT_DASHBOARD_TILES,
  layout: 'grid',
  theme: 'default',
};
