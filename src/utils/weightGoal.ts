/**
 * Progress toward a body-weight goal.
 *
 * The previous calculation was `current / goal * 100`, which is only coherent
 * for a weight-*gain* goal. For someone cutting from 90kg toward 80kg it
 * returned 112%, and it went *up* as they drifted further from target — the
 * clamp to 100 then hid the problem entirely, so the card read "100%"
 * regardless of what was happening.
 *
 * Progress is measured from the weight recorded when the goal was set
 * (`users.startingWeight`), which is the only way the question has an answer.
 */

export interface WeightGoalProgress {
  current: number;
  goal: number;
  startingWeight: number | null;
  /** 0–100, or null when there is no baseline to measure from. */
  percentage: number | null;
  /** Absolute amount still to go, in the user's unit. */
  remaining: number;
  direction: 'lose' | 'gain' | 'maintain';
  reached: boolean;
}

/** Below this the goal counts as met, to avoid a permanent 99%. */
const GOAL_TOLERANCE = 0.5;

export function calculateWeightGoalProgress(
  current: number | null | undefined,
  goal: number | null | undefined,
  startingWeight: number | null | undefined
): WeightGoalProgress | null {
  if (!current || !goal || current <= 0 || goal <= 0) return null;

  const delta = goal - current;
  const remaining = Math.abs(delta);
  const reached = remaining <= GOAL_TOLERANCE;

  const direction: WeightGoalProgress['direction'] = reached
    ? 'maintain'
    : delta < 0
      ? 'lose'
      : 'gain';

  // No baseline: report the distance to go, but don't invent a percentage.
  if (!startingWeight || startingWeight <= 0) {
    return {
      current,
      goal,
      startingWeight: null,
      percentage: reached ? 100 : null,
      remaining,
      direction,
      reached,
    };
  }

  const totalToChange = Math.abs(goal - startingWeight);

  // The goal was already met when it was set; nothing to measure.
  if (totalToChange < GOAL_TOLERANCE) {
    return {
      current,
      goal,
      startingWeight,
      percentage: 100,
      remaining,
      direction: 'maintain',
      reached: true,
    };
  }

  const changed = Math.abs(current - startingWeight);
  // Moving the wrong way scores 0 rather than a negative percentage.
  const movingTowardGoal =
    Math.sign(current - startingWeight) === Math.sign(goal - startingWeight);

  const percentage = movingTowardGoal
    ? Math.max(0, Math.min(100, Math.round((changed / totalToChange) * 100)))
    : 0;

  return {
    current,
    goal,
    startingWeight,
    percentage: reached ? 100 : percentage,
    remaining,
    direction,
    reached,
  };
}
