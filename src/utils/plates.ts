/**
 * Barbell loading.
 *
 * Answers "what do I put on each side for 102.5kg?" — arithmetic every lifter
 * does several times a session, under fatigue, and gets wrong often enough to
 * matter. Doing it here also catches the case that actually causes bad sets:
 * a target that *cannot* be loaded with the plates in the gym, which currently
 * shows up as a confusing moment at the rack rather than as information.
 */

export interface BarOption {
  id: string;
  name: string;
  /** Bar mass in kg and lb. Stored per unit rather than converted, because
   *  bars are manufactured to round numbers in their own system — a 20kg bar is
   *  not a 44.09lb bar in any gym, it is "the 45". */
  kg: number;
  lb: number;
}

export const BAR_OPTIONS: readonly BarOption[] = [
  { id: 'olympic', name: 'Olympic bar', kg: 20, lb: 45 },
  { id: 'womens', name: "Women's bar", kg: 15, lb: 35 },
  { id: 'training', name: 'Training bar', kg: 10, lb: 25 },
  { id: 'ez', name: 'EZ-curl bar', kg: 7.5, lb: 15 },
  { id: 'trap', name: 'Trap bar', kg: 25, lb: 55 },
  { id: 'none', name: 'No bar', kg: 0, lb: 0 },
] as const;

export const DEFAULT_BAR_ID = 'olympic';

export function barWeight(bar: BarOption, useMetric: boolean): number {
  return useMetric ? bar.kg : bar.lb;
}

export function findBar(id: string | null | undefined): BarOption {
  return BAR_OPTIONS.find((b) => b.id === id) ?? BAR_OPTIONS[0];
}

/**
 * Plate denominations, heaviest first. These are what a commercial gym actually
 * stocks; micro-plates below 1.25kg / 2.5lb are deliberately excluded because
 * assuming them produces loadings most people cannot make.
 */
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
export const PLATES_LB = [45, 35, 25, 10, 5, 2.5] as const;

export function plateSet(useMetric: boolean): readonly number[] {
  return useMetric ? PLATES_KG : PLATES_LB;
}

export interface PlateCount {
  plate: number;
  count: number;
}

export interface PlateLoading {
  /** Plates for ONE side of the bar, heaviest first. */
  perSide: PlateCount[];
  /** Total weight actually achievable — bar plus both sides. */
  achieved: number;
  /** What was asked for. */
  target: number;
  /** `achieved - target`. Non-zero when the target isn't loadable. */
  delta: number;
  /** True when `achieved` matches `target` within rounding tolerance. */
  exact: boolean;
  /** Target is below the bar alone, so there is nothing to load. */
  belowBar: boolean;
}

/**
 * Floating point guard. Plate maths runs in halves and quarters, so values like
 * 2.5 + 1.25 land on exact binary fractions, but repeated subtraction still
 * accumulates error — comparing against a tolerance rather than zero avoids a
 * phantom "0.0000001 over" on an otherwise exact loading.
 */
const EPSILON = 1e-6;

/**
 * Greedy largest-first plate solve.
 *
 * Greedy is optimal for these denominations because each is a multiple of the
 * one below it within its own run (25/20/15/10/5 and 2.5/1.25), so it can never
 * paint itself into a corner the way an arbitrary coin system could. It also
 * matches how people actually load a bar, which matters more than optimality:
 * a mathematically minimal loading that reads in an unfamiliar order is slower
 * to act on than the obvious one.
 *
 * `availablePerSide` bounds how many of each plate exist per side. Omit it for
 * an unlimited rack.
 */
export function calculatePlates(
  target: number,
  bar: number,
  plates: readonly number[],
  availablePerSide?: Readonly<Record<number, number>>
): PlateLoading {
  const belowBar = target < bar - EPSILON;

  if (!Number.isFinite(target) || target <= 0 || belowBar) {
    return {
      perSide: [],
      achieved: bar,
      target: Number.isFinite(target) ? target : 0,
      delta: bar - (Number.isFinite(target) ? target : 0),
      exact: Math.abs(bar - target) < EPSILON,
      belowBar,
    };
  }

  // Everything is computed per side, so the bar's weight comes off first and
  // the remainder is halved.
  let remainingPerSide = (target - bar) / 2;
  const perSide: PlateCount[] = [];

  for (const plate of plates) {
    if (remainingPerSide < plate - EPSILON) continue;

    const limit = availablePerSide?.[plate] ?? Number.POSITIVE_INFINITY;
    const count = Math.min(Math.floor((remainingPerSide + EPSILON) / plate), limit);
    if (count <= 0) continue;

    perSide.push({ plate, count });
    remainingPerSide -= count * plate;
  }

  const loadedPerSide = perSide.reduce((sum, p) => sum + p.plate * p.count, 0);
  const achieved = bar + loadedPerSide * 2;
  const delta = achieved - target;

  return {
    perSide,
    achieved,
    target,
    delta,
    exact: Math.abs(delta) < EPSILON,
    belowBar: false,
  };
}

/**
 * Convenience wrapper for the common case: the user's unit system, a named bar,
 * and a full rack.
 */
export function loadingFor(
  target: number,
  barId: string,
  useMetric: boolean
): PlateLoading {
  const bar = findBar(barId);
  return calculatePlates(target, barWeight(bar, useMetric), plateSet(useMetric));
}

/** e.g. "20 + 10 + 2.5" — the per-side loading as a compact string. */
export function formatPerSide(loading: PlateLoading): string {
  if (loading.perSide.length === 0) return 'Empty bar';
  return loading.perSide
    .flatMap(({ plate, count }) => Array.from({ length: count }, () => formatPlate(plate)))
    .join(' + ');
}

/** Plates are whole or half numbers; drop the trailing ".0". */
export function formatPlate(plate: number): string {
  return Number.isInteger(plate) ? String(plate) : String(plate);
}
