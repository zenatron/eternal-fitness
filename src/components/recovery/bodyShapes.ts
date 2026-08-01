import type { BodyRegion } from '@/lib/muscleRegions';

/**
 * Geometry for the body diagram.
 *
 * Kept as data rather than hand-written JSX so the figure can be nudged without
 * touching rendering logic, and so front and back stay symmetric by
 * construction — most regions are a mirrored pair, and defining them as
 * `mirrored: true` guarantees the left and right sides cannot drift apart.
 *
 * Deliberately stylised rather than anatomical. The job is to be pointed at on
 * a phone: a region has to be recognisable at ~150px wide and big enough to
 * tap, which rules out real muscle outlines.
 *
 * Coordinate space is 200 x 400, origin top-left, figure centred on x = 100.
 */

export const BODY_VIEWBOX = { width: 200, height: 400 };
const CENTRE = 100;

export type Shape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r?: number };

interface RegionShapes {
  shapes: Shape[];
  /** Duplicate each shape mirrored across the centre line. */
  mirrored?: boolean;
}

/**
 * Head, neck, hands and feet. Drawn in a neutral tone — they carry no recovery
 * state, but without them the coloured regions read as scattered blobs rather
 * than a body.
 */
export const SILHOUETTE: Shape[] = [
  { kind: 'ellipse', cx: CENTRE, cy: 28, rx: 19, ry: 22 },
  { kind: 'rect', x: 92, y: 44, w: 16, h: 16, r: 5 },
  // hands
  { kind: 'ellipse', cx: 48, cy: 198, rx: 8, ry: 10 },
  { kind: 'ellipse', cx: 152, cy: 198, rx: 8, ry: 10 },
  // feet
  { kind: 'ellipse', cx: 86, cy: 352, rx: 11, ry: 8 },
  { kind: 'ellipse', cx: 114, cy: 352, rx: 11, ry: 8 },
];

export const FRONT_SHAPES: Partial<Record<BodyRegion, RegionShapes>> = {
  shoulders: {
    mirrored: true,
    shapes: [{ kind: 'ellipse', cx: 68, cy: 72, rx: 19, ry: 15 }],
  },
  chest: {
    mirrored: true,
    shapes: [{ kind: 'rect', x: 80, y: 60, w: 19, h: 34, r: 8 }],
  },
  biceps: {
    mirrored: true,
    shapes: [{ kind: 'ellipse', cx: 56, cy: 108, rx: 11, ry: 26 }],
  },
  forearms: {
    mirrored: true,
    shapes: [{ kind: 'ellipse', cx: 48, cy: 162, rx: 9, ry: 30 }],
  },
  abs: {
    shapes: [{ kind: 'rect', x: 83, y: 96, w: 34, h: 56, r: 10 }],
  },
  hips: {
    shapes: [{ kind: 'rect', x: 82, y: 152, w: 36, h: 26, r: 9 }],
  },
  quads: {
    mirrored: true,
    shapes: [{ kind: 'ellipse', cx: 87, cy: 218, rx: 15, ry: 42 }],
  },
  calves: {
    mirrored: true,
    shapes: [{ kind: 'ellipse', cx: 88, cy: 302, rx: 11, ry: 38 }],
  },
};

export const BACK_SHAPES: Partial<Record<BodyRegion, RegionShapes>> = {
  shoulders: {
    mirrored: true,
    shapes: [{ kind: 'ellipse', cx: 68, cy: 72, rx: 19, ry: 15 }],
  },
  upperBack: {
    shapes: [{ kind: 'rect', x: 78, y: 58, w: 44, h: 44, r: 12 }],
  },
  lats: {
    mirrored: true,
    shapes: [{ kind: 'ellipse', cx: 84, cy: 112, rx: 15, ry: 26 }],
  },
  triceps: {
    mirrored: true,
    shapes: [{ kind: 'ellipse', cx: 56, cy: 108, rx: 11, ry: 26 }],
  },
  forearms: {
    mirrored: true,
    shapes: [{ kind: 'ellipse', cx: 48, cy: 162, rx: 9, ry: 30 }],
  },
  lowerBack: {
    shapes: [{ kind: 'rect', x: 85, y: 138, w: 30, h: 30, r: 9 }],
  },
  glutes: {
    mirrored: true,
    shapes: [{ kind: 'ellipse', cx: 87, cy: 184, rx: 17, ry: 19 }],
  },
  hamstrings: {
    mirrored: true,
    shapes: [{ kind: 'ellipse', cx: 87, cy: 232, rx: 15, ry: 40 }],
  },
  calves: {
    mirrored: true,
    shapes: [{ kind: 'ellipse', cx: 88, cy: 302, rx: 11, ry: 38 }],
  },
};

/** Mirrors a shape across the figure's centre line. */
function mirror(shape: Shape): Shape {
  if (shape.kind === 'ellipse') {
    return { ...shape, cx: CENTRE * 2 - shape.cx };
  }
  return { ...shape, x: CENTRE * 2 - shape.x - shape.w };
}

/** All shapes for a region in a view, mirrored pairs already expanded. */
export function shapesFor(
  view: 'front' | 'back',
  region: BodyRegion
): Shape[] {
  const entry = (view === 'front' ? FRONT_SHAPES : BACK_SHAPES)[region];
  if (!entry) return [];
  return entry.mirrored ? entry.shapes.flatMap((s) => [s, mirror(s)]) : entry.shapes;
}

/** Regions actually drawn in a view. */
export function drawnRegions(view: 'front' | 'back'): BodyRegion[] {
  return Object.keys(view === 'front' ? FRONT_SHAPES : BACK_SHAPES) as BodyRegion[];
}
