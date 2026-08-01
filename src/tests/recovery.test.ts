import { describe, test, expect } from 'bun:test';
import { BODY_REGIONS, type BodyRegion } from '@/lib/muscleRegions';
import { emptyRegionLoad, computeRegionLoad, type RegionLoad } from '@/utils/muscleLoad';
import {
  computeRecovery,
  decayFactor,
  halfLifeFor,
  capacityFor,
  recoveryStatus,
  freshestRegions,
  fatiguedRegions,
  RECOVERY_STATUS_LABELS,
  type LoadEvent,
} from '@/utils/recovery';

const NOW = new Date('2026-07-31T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

const loadOf = (region: BodyRegion, amount: number): RegionLoad => {
  const load = emptyRegionLoad();
  load[region] = amount;
  return load;
};

describe('decayFactor', () => {
  test('nothing has decayed at zero hours', () => {
    expect(decayFactor(0, 30)).toBe(1);
  });

  test('exactly half remains after one half-life', () => {
    expect(decayFactor(30, 30)).toBeCloseTo(0.5, 10);
    expect(decayFactor(60, 30)).toBeCloseTo(0.25, 10);
    expect(decayFactor(90, 30)).toBeCloseTo(0.125, 10);
  });

  test('decays monotonically and never reaches zero', () => {
    let previous = 1;
    for (let h = 1; h <= 500; h++) {
      const f = decayFactor(h, 24);
      expect(f).toBeLessThan(previous);
      expect(f).toBeGreaterThan(0);
      previous = f;
    }
  });

  test('negative elapsed time does not amplify a load', () => {
    expect(decayFactor(-10, 30)).toBe(1);
  });

  test('a non-positive half-life decays instantly rather than dividing by zero', () => {
    expect(decayFactor(5, 0)).toBe(0);
    expect(decayFactor(5, -1)).toBe(0);
  });
});

describe('region constants', () => {
  test('every region has a positive half-life and capacity', () => {
    for (const r of BODY_REGIONS) {
      expect(halfLifeFor(r)).toBeGreaterThan(0);
      expect(capacityFor(r)).toBeGreaterThan(0);
    }
  });

  test('large muscles hold fatigue longer and absorb more than small ones', () => {
    expect(halfLifeFor('quads')).toBeGreaterThan(halfLifeFor('calves'));
    expect(capacityFor('quads')).toBeGreaterThan(capacityFor('biceps'));
  });

  test('a large muscle still carries load after three days', () => {
    // The window the model is meant to cover.
    expect(decayFactor(72, halfLifeFor('quads'))).toBeGreaterThan(0.1);
    expect(decayFactor(72, halfLifeFor('quads'))).toBeLessThan(0.3);
  });
});

describe('computeRecovery', () => {
  test('an untrained body is entirely fresh', () => {
    const recovery = computeRecovery([], NOW);
    for (const r of BODY_REGIONS) {
      expect(recovery[r].freshness).toBe(1);
      expect(recovery[r].fatigue).toBe(0);
      expect(recovery[r].hoursSinceTrained).toBeNull();
    }
  });

  test('a hard session drops the trained region and leaves the rest alone', () => {
    const events: LoadEvent[] = [{ at: hoursAgo(1), load: loadOf('chest', 10) }];
    const recovery = computeRecovery(events, NOW);
    expect(recovery.chest.freshness).toBeLessThan(0.3);
    expect(recovery.quads.freshness).toBe(1);
  });

  test('freshness rises as time passes', () => {
    const at = [2, 24, 48, 96, 240].map(
      (h) => computeRecovery([{ at: hoursAgo(h), load: loadOf('chest', 10) }], NOW).chest.freshness
    );
    for (let i = 1; i < at.length; i++) expect(at[i]).toBeGreaterThan(at[i - 1]);
    // A week and a half out, it should be all but fully recovered.
    expect(at[at.length - 1]).toBeGreaterThan(0.95);
  });

  test('freshness stays within 0 and 1 however brutal the session', () => {
    const recovery = computeRecovery([{ at: hoursAgo(1), load: loadOf('chest', 500) }], NOW);
    expect(recovery.chest.freshness).toBe(0);
    expect(recovery.chest.freshness).toBeGreaterThanOrEqual(0);
  });

  test('repeated sessions accumulate', () => {
    const once = computeRecovery([{ at: hoursAgo(24), load: loadOf('lats', 5) }], NOW);
    const twice = computeRecovery(
      [
        { at: hoursAgo(24), load: loadOf('lats', 5) },
        { at: hoursAgo(20), load: loadOf('lats', 5) },
      ],
      NOW
    );
    expect(twice.lats.fatigue).toBeGreaterThan(once.lats.fatigue);
    expect(twice.lats.freshness).toBeLessThan(once.lats.freshness);
  });

  test('event order does not matter', () => {
    const a: LoadEvent[] = [
      { at: hoursAgo(10), load: loadOf('glutes', 4) },
      { at: hoursAgo(50), load: loadOf('glutes', 6) },
    ];
    const forward = computeRecovery(a, NOW).glutes;
    const reversed = computeRecovery([...a].reverse(), NOW).glutes;
    expect(reversed.fatigue).toBeCloseTo(forward.fatigue, 10);
    expect(reversed.hoursSinceTrained).toBe(forward.hoursSinceTrained);
  });

  test('hoursSinceTrained reports the most recent session, not the heaviest', () => {
    const recovery = computeRecovery(
      [
        { at: hoursAgo(100), load: loadOf('calves', 20) },
        { at: hoursAgo(6), load: loadOf('calves', 1) },
      ],
      NOW
    );
    expect(recovery.calves.hoursSinceTrained).toBeCloseTo(6, 6);
  });

  test('a region not touched by an event keeps a null last-trained', () => {
    const recovery = computeRecovery([{ at: hoursAgo(3), load: loadOf('chest', 8) }], NOW);
    expect(recovery.chest.hoursSinceTrained).toBeCloseTo(3, 6);
    expect(recovery.biceps.hoursSinceTrained).toBeNull();
  });

  test('a future-dated session is treated as just completed, not as amplified', () => {
    const future = computeRecovery(
      [{ at: new Date(NOW.getTime() + 5 * 3_600_000), load: loadOf('chest', 6) }],
      NOW
    );
    const justNow = computeRecovery([{ at: NOW, load: loadOf('chest', 6) }], NOW);
    expect(future.chest.fatigue).toBeCloseTo(justNow.chest.fatigue, 10);
  });

  test('unparseable dates are skipped rather than poisoning the map', () => {
    const recovery = computeRecovery(
      [
        { at: 'not a date', load: loadOf('chest', 10) },
        { at: hoursAgo(2), load: loadOf('chest', 3) },
      ],
      NOW
    );
    expect(Number.isFinite(recovery.chest.fatigue)).toBe(true);
    expect(recovery.chest.fatigue).toBeGreaterThan(0);
    expect(recovery.chest.fatigue).toBeLessThan(10);
  });

  test('an event with no load changes nothing', () => {
    const recovery = computeRecovery([{ at: hoursAgo(2), load: emptyRegionLoad() }], NOW);
    for (const r of BODY_REGIONS) expect(recovery[r].freshness).toBe(1);
  });

  test('every region is always present in the result', () => {
    const recovery = computeRecovery([{ at: hoursAgo(2), load: loadOf('chest', 5) }], NOW);
    expect(Object.keys(recovery).sort()).toEqual([...BODY_REGIONS].sort());
  });

  test('end to end from a real session shape', () => {
    const load = computeRegionLoad([
      { exerciseKey: 'Back Squats', sets: Array.from({ length: 5 }, () => ({ completed: true, actualReps: 5, actualWeight: 140, actualRpe: 9 })) },
    ]);
    const recovery = computeRecovery([{ at: hoursAgo(12), load }], NOW);
    expect(recovery.quads.freshness).toBeLessThan(1);
    expect(recovery.chest.freshness).toBe(1);
  });
});

describe('calibration', () => {
  /**
   * These pin the *shape* of the curve rather than exact numbers, so the
   * constants can be retuned without rewriting the suite — but not so far that
   * the model stops matching how recovery actually feels. Reference session:
   * five hard squat sets at RPE 9.
   */
  const legDay = () =>
    computeRegionLoad([
      {
        exerciseKey: 'Back Squats',
        sets: Array.from({ length: 5 }, () => ({
          completed: true,
          actualReps: 5,
          actualWeight: 140,
          actualRpe: 9,
        })),
      },
    ]);

  const quadsAfter = (hours: number) =>
    computeRecovery([{ at: hoursAgo(hours), load: legDay() }], NOW).quads.freshness;

  test('a hard leg day leaves quads needing rest immediately', () => {
    expect(quadsAfter(0)).toBeLessThan(0.35);
  });

  test('still not recovered the next morning', () => {
    expect(quadsAfter(12)).toBeLessThan(0.5);
  });

  test('roughly half recovered after a day', () => {
    expect(quadsAfter(24)).toBeGreaterThan(0.4);
    expect(quadsAfter(24)).toBeLessThan(0.7);
  });

  test('trainable again after two days', () => {
    expect(quadsAfter(48)).toBeGreaterThan(0.65);
  });

  test('essentially recovered after four days', () => {
    expect(quadsAfter(96)).toBeGreaterThan(0.85);
  });

  test('a light session is not treated as a hard one', () => {
    const light = computeRegionLoad([
      {
        exerciseKey: 'Back Squats',
        sets: [{ completed: true, actualReps: 8, actualWeight: 40, actualRpe: 5 }],
      },
    ]);
    const freshness = computeRecovery([{ at: hoursAgo(1), load: light }], NOW).quads.freshness;
    expect(freshness).toBeGreaterThan(0.8);
  });
});

describe('status buckets', () => {
  test('the scale runs the right way', () => {
    expect(recoveryStatus(1)).toBe('fresh');
    expect(recoveryStatus(0.8)).toBe('ready');
    expect(recoveryStatus(0.5)).toBe('moderate');
    expect(recoveryStatus(0.3)).toBe('fatigued');
    expect(recoveryStatus(0)).toBe('spent');
  });

  test('every freshness value gets a labelled bucket', () => {
    for (let f = 0; f <= 1.0001; f += 0.01) {
      const status = recoveryStatus(Math.min(1, f));
      expect(RECOVERY_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });
});

describe('readiness helpers', () => {
  const recovery = computeRecovery(
    [
      { at: hoursAgo(2), load: loadOf('chest', 11) },
      { at: hoursAgo(2), load: loadOf('quads', 6) },
    ],
    NOW
  );

  test('freshestRegions sorts descending and respects the limit', () => {
    const top = freshestRegions(recovery, 3);
    expect(top.length).toBe(3);
    for (let i = 1; i < top.length; i++) {
      expect(top[i].freshness).toBeLessThanOrEqual(top[i - 1].freshness);
    }
    expect(top.map((r) => r.region)).not.toContain('chest');
  });

  test('fatiguedRegions surfaces the worst first', () => {
    const tired = fatiguedRegions(recovery);
    expect(tired[0].region).toBe('chest');
    for (const r of tired) expect(r.freshness).toBeLessThan(0.45);
  });

  test('a rested body has nothing fatigued and everything fresh', () => {
    const rested = computeRecovery([], NOW);
    expect(fatiguedRegions(rested)).toEqual([]);
    expect(freshestRegions(rested, BODY_REGIONS.length).length).toBe(BODY_REGIONS.length);
  });
});
