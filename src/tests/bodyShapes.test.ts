import { describe, test, expect } from 'bun:test';
import {
  BODY_VIEWBOX,
  SILHOUETTE,
  drawnRegions,
  shapesFor,
  type Shape,
} from '@/components/recovery/bodyShapes';
import { BODY_REGIONS, REGION_META, regionsInView } from '@/lib/muscleRegions';

const bounds = (shape: Shape) =>
  shape.kind === 'ellipse'
    ? { x1: shape.cx - shape.rx, x2: shape.cx + shape.rx, y1: shape.cy - shape.ry, y2: shape.cy + shape.ry }
    : { x1: shape.x, x2: shape.x + shape.w, y1: shape.y, y2: shape.y + shape.h };

describe('body diagram geometry', () => {
  test('every region the model can report is drawn on at least one view', () => {
    // A region with no shape is invisible on the map, so its recovery state
    // would be computed and then silently thrown away.
    const drawn = new Set([...drawnRegions('front'), ...drawnRegions('back')]);
    const missing = BODY_REGIONS.filter((r) => !drawn.has(r));
    expect(missing).toEqual([]);
  });

  test('each region is drawn on the view its metadata claims', () => {
    for (const region of BODY_REGIONS) {
      const meta = REGION_META[region];
      const onFront = shapesFor('front', region).length > 0;
      const onBack = shapesFor('back', region).length > 0;
      if (meta.view === 'front') expect(onFront).toBe(true);
      if (meta.view === 'back') expect(onBack).toBe(true);
      if (meta.view === 'both') {
        expect(onFront).toBe(true);
        expect(onBack).toBe(true);
      }
    }
  });

  test('regionsInView agrees with what is actually drawn', () => {
    for (const view of ['front', 'back'] as const) {
      for (const region of regionsInView(view)) {
        expect(shapesFor(view, region).length).toBeGreaterThan(0);
      }
    }
  });

  test('paired regions are mirrored, so left and right cannot drift', () => {
    // Biceps are a mirrored pair; the two shapes should be equidistant from the
    // centre line.
    const shapes = shapesFor('front', 'biceps');
    expect(shapes.length).toBe(2);
    const centres = shapes.map((s) => (s.kind === 'ellipse' ? s.cx : s.x + s.w / 2));
    const centre = BODY_VIEWBOX.width / 2;
    expect(Math.abs(centres[0] - centre)).toBeCloseTo(Math.abs(centres[1] - centre), 6);
    expect(centres[0]).not.toBeCloseTo(centres[1], 6);
  });

  test('every shape sits inside the viewBox', () => {
    const all: Shape[] = [
      ...SILHOUETTE,
      ...(['front', 'back'] as const).flatMap((v) =>
        BODY_REGIONS.flatMap((r) => shapesFor(v, r))
      ),
    ];
    for (const shape of all) {
      const b = bounds(shape);
      expect(b.x1).toBeGreaterThanOrEqual(0);
      expect(b.y1).toBeGreaterThanOrEqual(0);
      expect(b.x2).toBeLessThanOrEqual(BODY_VIEWBOX.width);
      expect(b.y2).toBeLessThanOrEqual(BODY_VIEWBOX.height);
    }
  });

  test('every shape has positive dimensions', () => {
    for (const view of ['front', 'back'] as const) {
      for (const region of BODY_REGIONS) {
        for (const shape of shapesFor(view, region)) {
          if (shape.kind === 'ellipse') {
            expect(shape.rx).toBeGreaterThan(0);
            expect(shape.ry).toBeGreaterThan(0);
          } else {
            expect(shape.w).toBeGreaterThan(0);
            expect(shape.h).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test('an undrawn region returns an empty list rather than throwing', () => {
    // upperBack has no front-view shape.
    expect(shapesFor('front', 'upperBack')).toEqual([]);
  });

  test('regions are large enough to tap', () => {
    // At the rendered size the figure is ~240px wide against a 200-unit
    // viewBox, so one unit is a bit over one CSS pixel. A 10x10 unit region is
    // about 12px — small, but paired shapes double the target and the detail
    // list gives a non-spatial alternative.
    for (const view of ['front', 'back'] as const) {
      for (const region of drawnRegions(view)) {
        const area = shapesFor(view, region).reduce((total, s) => {
          const b = bounds(s);
          return total + (b.x2 - b.x1) * (b.y2 - b.y1);
        }, 0);
        expect(area).toBeGreaterThan(100);
      }
    }
  });
});
