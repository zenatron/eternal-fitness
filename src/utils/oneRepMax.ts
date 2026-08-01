/**
 * Estimated one-rep max (e1RM).
 *
 * The log already records the heaviest single weight lifted per exercise, but
 * that is a poor measure of strength on its own: 5 × 100kg is a stronger
 * performance than 1 × 105kg, and a max-weight PR cannot see the difference.
 * e1RM normalises weight and reps onto one number, which is what actually makes
 * "am I getting stronger?" answerable from a training log.
 *
 * Two formulas, averaged:
 *
 *  - **Epley** — `w × (1 + reps/30)`. Tends to read high at low reps.
 *  - **Brzycki** — `w × 36/(37 − reps)`. Tends to read low at low reps, and
 *    blows up as reps approach 37 (the denominator goes to zero).
 *
 * Neither is meaningfully more accurate than the other, and they err in
 * opposite directions, so the mean is steadier than either alone. This is an
 * estimate either way — it is shown as a trend line, never as a record claim.
 */

/**
 * Above this, the formulas stop being predictive: a 20-rep set is limited by
 * conditioning rather than by maximal strength, and both curves diverge sharply.
 * Sets beyond this return null rather than a confident-looking wrong number.
 */
export const MAX_REPS_FOR_ESTIMATE = 12;

/**
 * Estimated 1RM for a single set, in whatever unit `weight` is in.
 *
 * Returns null when the set cannot support an estimate: non-positive load
 * (bodyweight or unrecorded), no reps, or a rep count past the useful range.
 */
export function estimateOneRepMax(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null;
  if (weight <= 0 || reps <= 0) return null;
  if (reps > MAX_REPS_FOR_ESTIMATE) return null;

  // A single rep is already a true 1RM; running it through the formulas would
  // inflate it (Epley returns w × 1.033 at reps = 1).
  if (reps === 1) return weight;

  const epley = weight * (1 + reps / 30);
  const brzycki = weight * (36 / (37 - reps));

  return (epley + brzycki) / 2;
}

export interface SetLike {
  actualWeight?: number;
  actualReps?: number;
  completed?: boolean;
  skipped?: boolean;
}

export interface BestEstimate {
  oneRepMax: number;
  weight: number;
  reps: number;
}

/**
 * Best e1RM across a group of sets, ignoring anything skipped or unfinished.
 *
 * Returns the set that produced it as well as the number, so the UI can show
 * "from 5 × 100" rather than an unattributed figure — an estimate is much
 * easier to trust when you can see what it came from.
 */
export function bestOneRepMax(sets: readonly SetLike[]): BestEstimate | null {
  let best: BestEstimate | null = null;

  for (const set of sets) {
    if (!set.completed || set.skipped) continue;

    const weight = set.actualWeight ?? 0;
    const reps = set.actualReps ?? 0;
    const estimate = estimateOneRepMax(weight, reps);
    if (estimate === null) continue;

    if (!best || estimate > best.oneRepMax) {
      best = { oneRepMax: estimate, weight, reps };
    }
  }

  return best;
}

/**
 * Rounds for display. e1RM is an estimate, so trailing decimals imply a
 * precision that is not there — but sub-kilo resolution still matters when
 * comparing two close sets, hence one decimal rather than none.
 */
export function formatOneRepMax(value: number, useMetric: boolean): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${useMetric ? 'kg' : 'lb'}`;
}
