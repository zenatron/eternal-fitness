import { z } from 'zod';

/**
 * Shared validation for active-session updates.
 *
 * Lives outside the route directory because Next.js route modules may only
 * export request handlers and a fixed set of config values — exporting a schema
 * from `route.ts` is a build error.
 *
 * Used by both `PATCH /api/session/active` and the sendBeacon endpoint.
 */

/**
 * Upper bound on the JSON the client may persist into the hot `userStats` row.
 * A real template with 30 exercises serialises to well under 100KB; the 512KB
 * POST /start cap is the authoritative template bound, so PATCH/beacon match
 * it. Without a cap, an unbounded `z.any()` let a malicious or buggy client
 * write megabytes per sync into the row every dashboard read touches.
 */
export const MAX_ACTIVE_SESSION_JSON_BYTES = 512 * 1024;

/** Bounded `z.any()`: structural freedom, byte-level cap. */
function boundedAny(maxBytes = MAX_ACTIVE_SESSION_JSON_BYTES) {
  return z.any().superRefine((value, ctx) => {
    if (value === undefined || value === null) return;
    try {
      const size = JSON.stringify(value).length;
      if (size > maxBytes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Value exceeds the ${Math.round(maxBytes / 1024)}KB limit`,
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Value must be JSON-serialisable',
      });
    }
  });
}

export const updateSessionSchema = z.object({
  performance: z.record(boundedAny()).optional(),
  modifiedTemplate: boundedAny().optional(),
  exerciseProgress: z.record(boundedAny()).optional(),
  sessionNotes: z.string().max(10000).optional(),
  /** @deprecated superseded by accumulatedSeconds; accepted for old clients. */
  pausedTime: z.number().min(0).max(86400 * 7).optional(),
  isTimerActive: z.boolean().optional(),
  /** Seconds of active training in already-finished segments. */
  accumulatedSeconds: z.number().min(0).max(86400 * 7).optional(),
  /**
   * Nullable on purpose. `undefined` (key absent) means "leave unchanged";
   * explicit `null` means "clear". Pausing must clear segmentStartedAt, and
   * collapsing the two would leave a stale origin behind and corrupt the
   * elapsed-time calculation.
   */
  lastPauseTime: z.string().nullish(),
  segmentStartedAt: z.string().nullish(),
  /** Optimistic concurrency token; the server rejects a stale one with 409. */
  version: z.number().optional(),
});

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
