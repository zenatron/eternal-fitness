import { describe, test, expect } from 'bun:test';
import { DEFAULT_DASHBOARD_TILES, withDefaultTiles, type DashboardConfig } from '@/types/dashboard-config';

const saved = (tiles: { id: string; enabled: boolean; order: number }[]): DashboardConfig => ({
  tiles: tiles.map((t) => ({ ...t, name: 'Old Name', description: 'old', component: 'X' })),
  layout: 'grid',
  theme: 'default',
});

describe('withDefaultTiles', () => {
  test('adds a tile shipped after the layout was saved, at the end and on', () => {
    const merged = withDefaultTiles(saved([{ id: 'streak', enabled: true, order: 0 }]));
    const strength = merged.tiles.find((t) => t.id === 'strength')!;
    expect(strength.enabled).toBe(true);
    expect(strength.order).toBeGreaterThan(0);
    expect(merged.tiles).toHaveLength(DEFAULT_DASHBOARD_TILES.length);
  });

  test('keeps the user\'s choices but takes names from the defaults', () => {
    const merged = withDefaultTiles(saved([{ id: 'level', enabled: false, order: 9 }]));
    const level = merged.tiles.find((t) => t.id === 'level')!;
    expect(level.enabled).toBe(false);
    expect(level.order).toBe(9);
    expect(level.name).toBe('Level');
    expect(level.component).toBe('LevelCard');
  });

  test('drops tiles that no longer exist', () => {
    const merged = withDefaultTiles(saved([{ id: 'gone', enabled: true, order: 0 }]));
    expect(merged.tiles.some((t) => t.id === 'gone')).toBe(false);
  });
});
