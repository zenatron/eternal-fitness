import { BODY_REGIONS, REGION_META, type BodyRegion } from '@/lib/muscleRegions';
import { emptyRegionLoad, type RegionLoad } from '@/utils/muscleLoad';

/**
 * Muscle recovery.
 *
 * A deliberately simple model: each session's load decays with a half-life, the
 * surviving load from every recent session is summed per region, and that is
 * compared against what the region can absorb before it is considered spent.
 *
 * This is a heuristic, not physiology. Real recovery depends on sleep, calories,
 * training age, and the specific movement — none of which the app knows. What it
 * *is* good for is the question people actually ask: "is it reasonable to train
 * chest today?" The constants below are tunable in one place precisely because
 * they are estimates.
 */

/**
 * Hours for half a session's load to dissipate, by muscle size.
 *
 * Large muscles take longer: a heavy squat session is felt for days, whereas
 * calves and forearms turn over quickly. These land in the commonly cited
 * 24–72h full-recovery window — at a 30h half-life a large muscle still carries
 * ~19% of its load after three days.
 */
const HALF_LIFE_HOURS: Record<'large' | 'medium' | 'small', number> = {
  large: 30,
  medium: 24,
  small: 18,
};

/**
 * Effective sets a region absorbs before reading as fully spent.
 *
 * Roughly one hard session's worth of direct work: five to seven hard sets on a
 * large muscle is a session, not a warm-up. Larger muscles tolerate more, which
 * is why this scales with size rather than being flat.
 *
 * Calibrated against a realistic push/pull/legs week rather than picked in the
 * abstract. At the first values tried (12/9/6) five hard squat sets six hours
 * earlier reported quads as 59% fresh — directionally right but far too
 * forgiving to act on. These put the same session near 20%, which is the answer
 * a lifter would actually give.
 */
const CAPACITY: Record<'large' | 'medium' | 'small', number> = {
  large: 7,
  medium: 5,
  small: 3.5,
};

export function halfLifeFor(region: BodyRegion): number {
  return HALF_LIFE_HOURS[REGION_META[region].size];
}

export function capacityFor(region: BodyRegion): number {
  return CAPACITY[REGION_META[region].size];
}

/** A past session's contribution to current fatigue. */
export interface LoadEvent {
  /** When the session was completed. */
  at: Date | string;
  load: RegionLoad;
}

export interface RegionRecovery {
  region: BodyRegion;
  /** 0 = fully spent, 1 = fully recovered. */
  freshness: number;
  /** Surviving load in effective sets, after decay. */
  fatigue: number;
  /** Hours since this region was last trained at all; null if never. */
  hoursSinceTrained: number | null;
}

export type RecoveryMap = Record<BodyRegion, RegionRecovery>;

/**
 * Fraction of a load still present after some hours, for a given half-life.
 *
 * Exported because it is the whole model in one line, and it is far easier to
 * reason about — and test — than the aggregate.
 */
export function decayFactor(hoursElapsed: number, halfLifeHours: number): number {
  if (!Number.isFinite(hoursElapsed) || hoursElapsed <= 0) return 1;
  if (!Number.isFinite(halfLifeHours) || halfLifeHours <= 0) return 0;
  return Math.pow(0.5, hoursElapsed / halfLifeHours);
}

const MS_PER_HOUR = 3_600_000;

function hoursBetween(from: Date | string, to: Date): number | null {
  const start = from instanceof Date ? from : new Date(from);
  const ms = start.getTime();
  if (!Number.isFinite(ms)) return null;
  // Future-dated sessions (clock skew, a manually edited date) are treated as
  // just-completed rather than producing a negative elapsed time, which would
  // amplify the load instead of decaying it.
  return Math.max(0, (to.getTime() - ms) / MS_PER_HOUR);
}

/**
 * Current recovery state for every region.
 *
 * `events` may be in any order and may include sessions that touched no
 * relevant muscles; both are ignored cleanly.
 */
export function computeRecovery(events: readonly LoadEvent[], now: Date = new Date()): RecoveryMap {
  const fatigue = emptyRegionLoad();
  const lastTrained: Partial<Record<BodyRegion, number>> = {};

  for (const event of events) {
    const hours = hoursBetween(event.at, now);
    if (hours === null) continue;

    for (const region of BODY_REGIONS) {
      const load = event.load?.[region] ?? 0;
      if (load <= 0) continue;

      fatigue[region] += load * decayFactor(hours, halfLifeFor(region));

      const previous = lastTrained[region];
      if (previous === undefined || hours < previous) lastTrained[region] = hours;
    }
  }

  return Object.fromEntries(
    BODY_REGIONS.map((region) => {
      const capacity = capacityFor(region);
      const surviving = fatigue[region];
      const freshness = Math.max(0, Math.min(1, 1 - surviving / capacity));
      return [
        region,
        {
          region,
          freshness,
          fatigue: surviving,
          hoursSinceTrained: lastTrained[region] ?? null,
        } satisfies RegionRecovery,
      ];
    })
  ) as RecoveryMap;
}

/** Coarse buckets, for labelling and for choosing a colour ramp stop. */
export type RecoveryStatus = 'fresh' | 'ready' | 'moderate' | 'fatigued' | 'spent';

export function recoveryStatus(freshness: number): RecoveryStatus {
  if (freshness >= 0.9) return 'fresh';
  if (freshness >= 0.7) return 'ready';
  if (freshness >= 0.45) return 'moderate';
  if (freshness >= 0.2) return 'fatigued';
  return 'spent';
}

export const RECOVERY_STATUS_LABELS: Record<RecoveryStatus, string> = {
  fresh: 'Fresh',
  ready: 'Ready',
  moderate: 'Moderate',
  fatigued: 'Fatigued',
  spent: 'Needs rest',
};

/**
 * Regions most ready to train, freshest first.
 *
 * Regions never trained sort as fully fresh, which is correct for a new user but
 * means this is a readiness list rather than a recommendation — it says nothing
 * about whether the exercise exists in your templates.
 */
export function freshestRegions(recovery: RecoveryMap, limit = 5): RegionRecovery[] {
  return BODY_REGIONS.map((r) => recovery[r])
    .sort((a, b) => b.freshness - a.freshness)
    .slice(0, limit);
}

/** Regions that would be unwise to train hard right now. */
export function fatiguedRegions(recovery: RecoveryMap, threshold = 0.45): RegionRecovery[] {
  return BODY_REGIONS.map((r) => recovery[r])
    .filter((r) => r.freshness < threshold)
    .sort((a, b) => a.freshness - b.freshness);
}
