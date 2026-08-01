import type { MuscleGroup } from '@/lib/muscleGroups';

/**
 * Body regions, for the recovery map.
 *
 * The exercise library names 28 muscle groups, which is the right resolution
 * for describing an exercise but not for drawing a body: 'Chest' and 'Upper
 * Chest' are one shape on a diagram, and 'Rotator Cuff' is not a shape at all.
 * These are the regions a person can actually point at.
 *
 * Kept separate from MuscleGroup rather than replacing it — the library's
 * precision is worth keeping, and this is a presentation concern.
 */

export const BODY_REGIONS = [
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'lats',
  'upperBack',
  'lowerBack',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
  'hips',
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];

/** Which side of the body diagram a region is drawn on. */
export type BodyView = 'front' | 'back' | 'both';

export const REGION_META: Record<BodyRegion, { label: string; view: BodyView; size: 'large' | 'medium' | 'small' }> = {
  chest: { label: 'Chest', view: 'front', size: 'large' },
  shoulders: { label: 'Shoulders', view: 'both', size: 'medium' },
  biceps: { label: 'Biceps', view: 'front', size: 'small' },
  triceps: { label: 'Triceps', view: 'back', size: 'small' },
  forearms: { label: 'Forearms', view: 'both', size: 'small' },
  abs: { label: 'Core', view: 'front', size: 'medium' },
  lats: { label: 'Lats', view: 'back', size: 'large' },
  upperBack: { label: 'Upper Back', view: 'back', size: 'large' },
  lowerBack: { label: 'Lower Back', view: 'back', size: 'medium' },
  glutes: { label: 'Glutes', view: 'back', size: 'large' },
  quads: { label: 'Quads', view: 'front', size: 'large' },
  hamstrings: { label: 'Hamstrings', view: 'back', size: 'large' },
  calves: { label: 'Calves', view: 'both', size: 'small' },
  hips: { label: 'Hips', view: 'front', size: 'small' },
};

/**
 * How each named muscle group maps onto regions.
 *
 * One-to-many with weights, because the library's broad groups genuinely do not
 * resolve to a single region: 'Back' covers three, and 'Full Body' covers
 * everything. Spreading them thinly is more honest than picking a
 * representative region, and it keeps cardio and compound work from vanishing
 * off the map entirely.
 *
 * Weights within an entry sum to 1, so a broad group never credits more total
 * load than a specific one.
 */
const MUSCLE_TO_REGIONS: Record<string, Partial<Record<BodyRegion, number>>> = {
  // Direct, one-to-one
  Chest: { chest: 1 },
  'Upper Chest': { chest: 1 },
  Triceps: { triceps: 1 },
  Biceps: { biceps: 1 },
  Brachialis: { biceps: 1 },
  Forearms: { forearms: 1 },
  Lats: { lats: 1 },
  'Upper Back': { upperBack: 1 },
  Traps: { upperBack: 1 },
  'Lower Back': { lowerBack: 1 },
  Quadriceps: { quads: 1 },
  Hamstrings: { hamstrings: 1 },
  Glutes: { glutes: 1 },
  Calves: { calves: 1 },
  Core: { abs: 1 },
  Obliques: { abs: 1 },
  'Hip Flexors': { hips: 1 },
  Adductors: { hips: 1 },
  Abductors: { hips: 1 },

  // Deltoid heads all render as one shape.
  'Front Deltoids': { shoulders: 1 },
  'Side Deltoids': { shoulders: 1 },
  'Rear Deltoids': { shoulders: 1 },
  Shoulders: { shoulders: 1 },
  'Rotator Cuff': { shoulders: 1 },

  // Broad groups, spread.
  Back: { lats: 0.4, upperBack: 0.4, lowerBack: 0.2 },
  Arms: { biceps: 0.4, triceps: 0.4, forearms: 0.2 },
  Legs: { quads: 0.35, hamstrings: 0.3, glutes: 0.25, calves: 0.1 },
  'Full Body': {
    chest: 0.1,
    shoulders: 0.1,
    biceps: 0.05,
    triceps: 0.05,
    abs: 0.1,
    lats: 0.1,
    upperBack: 0.1,
    lowerBack: 0.05,
    glutes: 0.1,
    quads: 0.15,
    hamstrings: 0.05,
    calves: 0.05,
  },
};

/**
 * Regions a muscle group contributes to, with weights.
 *
 * Returns an empty object for anything unrecognised rather than throwing — the
 * exercise library is user-extendable data, and one unmapped muscle should cost
 * that exercise its heatmap contribution, not break the whole map.
 */
export function regionsForMuscle(muscle: string): Partial<Record<BodyRegion, number>> {
  return MUSCLE_TO_REGIONS[muscle] ?? {};
}

/** Every muscle group name that maps to something. For validation and tests. */
export function mappedMuscles(): string[] {
  return Object.keys(MUSCLE_TO_REGIONS);
}

export function isBodyRegion(value: unknown): value is BodyRegion {
  return typeof value === 'string' && (BODY_REGIONS as readonly string[]).includes(value);
}

/** Regions drawn on a given view of the body. */
export function regionsInView(view: 'front' | 'back'): BodyRegion[] {
  return BODY_REGIONS.filter((r) => REGION_META[r].view === view || REGION_META[r].view === 'both');
}

/** Type-level check that every MuscleGroup is mapped; see the test suite. */
export type UnmappedMuscleGroup = Exclude<MuscleGroup, keyof typeof MUSCLE_TO_REGIONS>;
