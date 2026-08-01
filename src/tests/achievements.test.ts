import { describe, test, expect } from 'bun:test';
import {
  calculateAchievementProgress,
  checkUnlockedAchievements,
  calculatePointsForAchievements,
} from '@/lib/achievements';
import {
  ACHIEVEMENT_DEFINITIONS,
  TIER_POINTS,
  localizeAchievement,
  type UserAchievements,
  type AchievementCategory,
} from '@/types/achievements';
import { calculateWorkoutXP, XP_PER_WORKOUT, XP_PER_PR } from '@/lib/xp';

const noAchievements = (unlocked: string[] = []): UserAchievements => ({
  unlockedAchievements: unlocked,
  progress: {},
  lastUpdated: new Date().toISOString(),
});

const emptyProgress = () =>
  Object.fromEntries(
    ACHIEVEMENT_DEFINITIONS.map((a) => [a.category, 0])
  ) as Record<AchievementCategory, number>;

describe('calculateAchievementProgress', () => {
  test('maps user stats onto the achievement categories', () => {
    const p = calculateAchievementProgress({
      totalVolume: 50_000,
      totalWorkouts: 42,
      uniqueExercises: 17,
      totalTrainingHours: 60,
      longestStreak: 9,
      activeWeeks: 12,
    });
    expect(p.volume_lifted).toBe(50_000);
    expect(p.workouts_completed).toBe(42);
    expect(p.unique_exercises).toBe(17);
    expect(p.workout_hours).toBe(60);
    expect(p.consistency_streak).toBe(9);
    expect(p.dedication).toBe(12);
  });

  test('missing stats read as zero rather than undefined', () => {
    const p = calculateAchievementProgress({});
    for (const value of Object.values(p)) {
      expect(typeof value).toBe('number');
      expect(Number.isNaN(value)).toBe(false);
    }
  });

  test('counts every record type on every exercise', () => {
    const p = calculateAchievementProgress({
      personalRecords: {
        'Bench Press': { maxWeight: {}, maxVolume: {}, maxOneRepMax: {} },
        Squat: { maxWeight: {} },
        Running: { maxDuration: {}, maxDistance: {} },
      },
    });
    expect(p.personal_records).toBe(6);
  });

  test('counts estimated-1RM records', () => {
    // This is what the previous hand-written list of record types missed: e1RM
    // PRs were stored but never counted towards the achievement.
    const withE1RM = calculateAchievementProgress({
      personalRecords: { 'Bench Press': { maxWeight: {}, maxOneRepMax: {} } },
    });
    const without = calculateAchievementProgress({
      personalRecords: { 'Bench Press': { maxWeight: {} } },
    });
    expect(withE1RM.personal_records).toBe(without.personal_records + 1);
  });

  test('tolerates malformed personal-record entries', () => {
    const p = calculateAchievementProgress({
      personalRecords: { A: null, B: undefined, C: 'nonsense', D: { maxWeight: {} } },
    });
    expect(p.personal_records).toBe(1);
  });

  test('folds in session-derived progress', () => {
    const p = calculateAchievementProgress(
      {},
      {
        earlyBirdCount: 5,
        nightOwlCount: 3,
        maxTemplateSessions: 11,
        bestMonthWorkouts: 20,
        totalDistance: 42.2,
        cardioSessionsCount: 8,
        cardioDurationHours: 6.5,
      }
    );
    expect(p.early_bird).toBe(5);
    expect(p.night_owl).toBe(3);
    expect(p.template_mastery).toBe(11);
    expect(p.monthly_warrior).toBe(20);
    expect(p.total_distance).toBeCloseTo(42.2, 5);
    expect(p.cardio_sessions).toBe(8);
    expect(p.cardio_duration).toBeCloseTo(6.5, 5);
  });

  test('supplies a value for every category an achievement uses', () => {
    // A category with no entry would read undefined and never unlock.
    const p = calculateAchievementProgress({});
    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
      expect(p[achievement.category]).toBeDefined();
    }
  });
});

describe('checkUnlockedAchievements', () => {
  test('unlocks exactly at the requirement, not one past it', () => {
    const target = ACHIEVEMENT_DEFINITIONS.find((a) => a.category === 'workouts_completed')!;
    const { requirement } = localizeAchievement(target, true);

    const below = emptyProgress();
    below.workouts_completed = requirement - 1;
    expect(checkUnlockedAchievements(below, noAchievements(), true)).not.toContain(target.id);

    const at = emptyProgress();
    at.workouts_completed = requirement;
    expect(checkUnlockedAchievements(at, noAchievements(), true)).toContain(target.id);
  });

  test('never re-unlocks something already held', () => {
    const progress = emptyProgress();
    for (const key of Object.keys(progress)) {
      progress[key as AchievementCategory] = Number.MAX_SAFE_INTEGER;
    }
    const all = ACHIEVEMENT_DEFINITIONS.map((a) => a.id);
    expect(checkUnlockedAchievements(progress, noAchievements(all), true)).toEqual([]);
  });

  test('an all-zero user unlocks nothing', () => {
    expect(checkUnlockedAchievements(emptyProgress(), noAchievements(), true)).toEqual([]);
  });

  test('maxed-out progress unlocks everything exactly once', () => {
    const progress = emptyProgress();
    for (const key of Object.keys(progress)) {
      progress[key as AchievementCategory] = Number.MAX_SAFE_INTEGER;
    }
    const unlocked = checkUnlockedAchievements(progress, noAchievements(), true);
    expect(unlocked.length).toBe(ACHIEVEMENT_DEFINITIONS.length);
    expect(new Set(unlocked).size).toBe(unlocked.length);
  });

  test('imperial users are held to the imperial requirement', () => {
    // Volume achievements state a different number in lb than in kg; using the
    // metric threshold for an imperial user would unlock them far too early.
    const target = ACHIEVEMENT_DEFINITIONS.find(
      (a) => a.imperialRequirement !== undefined && a.imperialRequirement !== a.requirement
    );
    if (!target) return;

    const metricReq = localizeAchievement(target, true).requirement;
    const imperialReq = localizeAchievement(target, false).requirement;
    const lower = Math.min(metricReq, imperialReq);
    const higher = Math.max(metricReq, imperialReq);

    const between = emptyProgress();
    between[target.category] = (lower + higher) / 2;

    const metricUnlocked = checkUnlockedAchievements(between, noAchievements(), true);
    const imperialUnlocked = checkUnlockedAchievements(between, noAchievements(), false);
    // Whichever system has the lower threshold is the one that unlocks here.
    expect(metricUnlocked.includes(target.id)).toBe(metricReq === lower);
    expect(imperialUnlocked.includes(target.id)).toBe(imperialReq === lower);
  });

  test('an unknown category degrades to locked rather than throwing', () => {
    const progress = {} as Record<AchievementCategory, number>;
    expect(() => checkUnlockedAchievements(progress, noAchievements(), true)).not.toThrow();
    expect(checkUnlockedAchievements(progress, noAchievements(), true)).toEqual([]);
  });
});

describe('calculatePointsForAchievements', () => {
  test('awards the tier value for each id', () => {
    const a = ACHIEVEMENT_DEFINITIONS[0];
    const expected = TIER_POINTS[a.tier as keyof typeof TIER_POINTS] ?? a.points;
    expect(calculatePointsForAchievements([a.id])).toBe(expected);
  });

  test('sums across several achievements', () => {
    const picks = ACHIEVEMENT_DEFINITIONS.slice(0, 4);
    const expected = picks.reduce(
      (t, a) => t + (TIER_POINTS[a.tier as keyof typeof TIER_POINTS] ?? a.points),
      0
    );
    expect(calculatePointsForAchievements(picks.map((a) => a.id))).toBe(expected);
  });

  test('unknown ids contribute nothing instead of NaN', () => {
    expect(calculatePointsForAchievements(['does-not-exist'])).toBe(0);
    const real = ACHIEVEMENT_DEFINITIONS[0];
    const alone = calculatePointsForAchievements([real.id]);
    expect(calculatePointsForAchievements([real.id, 'nope'])).toBe(alone);
  });

  test('an empty list is worth nothing', () => {
    expect(calculatePointsForAchievements([])).toBe(0);
  });

  test('every definition has a positive point value', () => {
    for (const a of ACHIEVEMENT_DEFINITIONS) {
      expect(calculatePointsForAchievements([a.id])).toBeGreaterThan(0);
    }
  });
});

describe('calculateWorkoutXP', () => {
  test('a workout with no records is worth the flat award', () => {
    expect(calculateWorkoutXP({ newPRs: 0 })).toBe(XP_PER_WORKOUT);
  });

  test('each record adds its bonus', () => {
    expect(calculateWorkoutXP({ newPRs: 3 })).toBe(XP_PER_WORKOUT + 3 * XP_PER_PR);
  });

  test('never awards less than the flat amount', () => {
    // A negative count reaching the SQL update would subtract points.
    expect(calculateWorkoutXP({ newPRs: -5 })).toBe(XP_PER_WORKOUT);
    expect(calculateWorkoutXP({ newPRs: Number.NaN })).toBe(XP_PER_WORKOUT);
    expect(calculateWorkoutXP({ newPRs: Number.POSITIVE_INFINITY })).toBe(XP_PER_WORKOUT);
  });

  test('fractional counts do not produce fractional points', () => {
    expect(Number.isInteger(calculateWorkoutXP({ newPRs: 2.7 }))).toBe(true);
    expect(calculateWorkoutXP({ newPRs: 2.7 })).toBe(XP_PER_WORKOUT + 2 * XP_PER_PR);
  });

  test('is always positive, so the award is never a deduction', () => {
    for (const prs of [-100, -1, 0, 1, 5, 50]) {
      expect(calculateWorkoutXP({ newPRs: prs })).toBeGreaterThan(0);
    }
  });
});
