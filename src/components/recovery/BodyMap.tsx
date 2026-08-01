'use client';

import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { BodyRegion } from '@/lib/muscleRegions';
import { REGION_META } from '@/lib/muscleRegions';
import type { RecoveryMap } from '@/utils/recovery';
import { recoveryStatus, RECOVERY_STATUS_LABELS } from '@/utils/recovery';
import { BODY_VIEWBOX, SILHOUETTE, drawnRegions, shapesFor, type Shape } from './bodyShapes';

/**
 * Body heatmap of muscle recovery.
 *
 * Intensity runs the opposite way to the obvious one: a *spent* muscle is the
 * most saturated and a fully recovered one is nearly invisible. The map exists
 * to answer "what should I leave alone today", so the ink belongs on the
 * actionable state rather than on the majority of the body that is fine.
 *
 * Rendered in the accent colour rather than green-to-red. Green and red already
 * mean "success" and "destructive" everywhere else in the app, and going
 * through the accent scale means the map themes with whichever accent is active
 * instead of being the one screen that ignores it.
 */

interface BodyMapProps {
  recovery: RecoveryMap;
  view: 'front' | 'back';
  /** Highlighted region, e.g. the one under the cursor or selected in a list. */
  selected?: BodyRegion | null;
  onSelect?: (region: BodyRegion) => void;
}

/**
 * Opacity ramp for a region's accent fill.
 *
 * Fully fresh regions are nearly transparent and spent ones are solid, so the
 * eye is drawn to what needs rest — the actionable state — rather than to the
 * majority of the body that is fine.
 */
function fillOpacity(freshness: number): number {
  return 0.08 + (1 - freshness) * 0.84;
}

function ShapeEl({ shape }: { shape: Shape }) {
  if (shape.kind === 'ellipse') {
    return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />;
  }
  return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r ?? 6} />;
}

export function BodyMap({ recovery, view, selected, onSelect }: BodyMapProps) {
  const prefersReducedMotion = useReducedMotion();
  const titleId = useId();
  const regions = drawnRegions(view);

  return (
    <svg
      viewBox={`0 0 ${BODY_VIEWBOX.width} ${BODY_VIEWBOX.height}`}
      className="h-full w-full"
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>
        {`Muscle recovery, ${view} view. ` +
          regions
            .map((r) => `${REGION_META[r].label}: ${RECOVERY_STATUS_LABELS[recoveryStatus(recovery[r].freshness)]}`)
            .join('. ')}
      </title>

      {/* Neutral body parts, drawn first so regions sit on top. */}
      <g className="fill-surface-800/40 dark:fill-surface-300/50">
        {SILHOUETTE.map((shape, i) => (
          <ShapeEl key={i} shape={shape} />
        ))}
      </g>

      {regions.map((region) => {
        const state = recovery[region];
        const shapes = shapesFor(view, region);

        return (
          <motion.g
            key={region}
            className="fill-accent-500"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: fillOpacity(state.freshness) }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
            data-region={region}
          >
            {/*
             * The handler sits on each shape rather than on the group. A
             * mirrored pair — left and right biceps — gives the group a
             * bounding box spanning the whole torso, so its centre point lands
             * on a completely different muscle: taps aimed at it were being
             * swallowed by whichever region happened to be drawn over the
             * middle of the body.
             *
             * Shapes are aria-hidden and the map is described by <title>;
             * keyboard and screen-reader users select regions from the lists
             * beside the diagram, which are real buttons.
             */}
            {shapes.map((shape, i) => (
              <g
                key={i}
                onClick={onSelect ? () => onSelect(region) : undefined}
                className={onSelect ? 'cursor-pointer' : undefined}
                aria-hidden="true"
              >
                <ShapeEl shape={shape} />
              </g>
            ))}
          </motion.g>
        );
      })}

      {/* Selection ring, drawn last so it is never covered by a neighbour. */}
      {selected &&
        shapesFor(view, selected).map((shape, i) => (
          <g
            key={`sel-${i}`}
            className="fill-none stroke-accent-300 dark:stroke-accent-200"
            strokeWidth={2.5}
          >
            <ShapeEl shape={shape} />
          </g>
        ))}
    </svg>
  );
}
