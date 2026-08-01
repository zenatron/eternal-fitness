import { describe, test, expect } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClient } from '@tanstack/react-query';
import {
  queryKeys,
  templateKey,
  invalidateWorkoutData,
  invalidateTemplateData,
  invalidateProfileData,
} from '@/lib/queryKeys';

/**
 * These guard the bug this module was written to fix: a query being added
 * without anything invalidating it, so its screen silently shows stale data
 * after the user changes something.
 */

/** Keys no user action can invalidate, with the reason. */
const EXEMPT: Partial<Record<keyof typeof queryKeys, string>> = {
  exercise: 'static library metadata, cannot change at runtime',
  dashboardConfig: 'invalidated by its own mutation in useDashboardConfig',
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(path) && !path.includes('/tests/')) out.push(path);
  }
  return out;
}

/** Records which keys a group touches, without hitting the network. */
function keysTouchedBy(run: (client: QueryClient) => Promise<void>): Promise<string[]> {
  const client = new QueryClient();
  const seen: string[] = [];
  const original = client.invalidateQueries.bind(client);
  client.invalidateQueries = ((filters?: { queryKey?: unknown[] }) => {
    if (filters?.queryKey) seen.push(String(filters.queryKey[0]));
    return original(filters as never);
  }) as typeof client.invalidateQueries;
  return run(client).then(() => seen);
}

describe('query key registry', () => {
  test('every key is a non-empty array with a unique root', () => {
    const roots = Object.values(queryKeys).map((k) => k[0]);
    expect(roots.every((r) => typeof r === 'string' && r.length > 0)).toBe(true);
    expect(new Set(roots).size).toBe(roots.length);
  });

  test('templateKey extends the template prefix, so prefix invalidation reaches it', () => {
    const key = templateKey('abc');
    expect(key[0]).toBe(queryKeys.template[0]);
    expect(key[1]).toBe('abc');
  });
});

describe('invalidation coverage', () => {
  test('every registered key is invalidated by some group, or is exempt', async () => {
    const covered = new Set([
      ...(await keysTouchedBy(invalidateWorkoutData)),
      ...(await keysTouchedBy((c) => invalidateTemplateData(c, 'id'))),
      ...(await keysTouchedBy(invalidateProfileData)),
    ]);

    const orphans = (Object.keys(queryKeys) as (keyof typeof queryKeys)[]).filter(
      (name) => !EXEMPT[name] && !covered.has(queryKeys[name][0])
    );
    expect(orphans).toEqual([]);
  });

  test('finishing a workout refreshes everything a session moves', async () => {
    // The specific regression: this used to invalidate nothing at all.
    const touched = await keysTouchedBy(invalidateWorkoutData);
    for (const key of [
      queryKeys.profile,
      queryKeys.dashboardData,
      queryKeys.userStats,
      queryKeys.leaderboard,
      queryKeys.progress,
      queryKeys.lastPerformance,
      queryKeys.exerciseHistory,
      queryKeys.recovery,
    ]) {
      expect(touched).toContain(key[0]);
    }
  });

  test('editing a template refreshes the list, the detail and the dashboard', async () => {
    const touched = await keysTouchedBy((c) => invalidateTemplateData(c, 'abc'));
    expect(touched).toContain(queryKeys.templates[0]);
    expect(touched).toContain(queryKeys.template[0]);
    expect(touched).toContain(queryKeys.dashboardData[0]);
  });

  test('editing a profile refreshes the places a name or avatar appears', async () => {
    const touched = await keysTouchedBy(invalidateProfileData);
    expect(touched).toContain(queryKeys.profile[0]);
    expect(touched).toContain(queryKeys.dashboardData[0]);
    expect(touched).toContain(queryKeys.leaderboard[0]);
  });

  test('groups resolve rather than leaving the caller to guess when to navigate', async () => {
    const client = new QueryClient();
    await expect(invalidateWorkoutData(client)).resolves.toBeUndefined();
  });
});

describe('no unregistered query keys', () => {
  test('every queryKey literal in the app comes from the registry', () => {
    const offenders: string[] = [];
    for (const file of walk('src')) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/queryKey:\s*\[\s*'([^']+)'/g)) {
        offenders.push(`${file}: ['${match[1]}'…]`);
      }
    }
    // A raw string literal here means a query nothing in queryKeys.ts knows
    // about, which is exactly how the stale-data bug happened.
    expect(offenders).toEqual([]);
  });

  test('mutations invalidate through the groups, not by naming keys', () => {
    const source = readFileSync('src/lib/hooks/useMutations.ts', 'utf8');
    expect(source).not.toMatch(/invalidateQueries\(\{\s*queryKey:\s*\[\s*'/);
  });
});
