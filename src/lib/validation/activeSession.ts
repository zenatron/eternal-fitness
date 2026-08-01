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
export const updateSessionSchema = z.object({
  performance: z.record(z.any()).optional(),
  modifiedTemplate: z.any().optional(),
  exerciseProgress: z.record(z.any()).optional(),
  sessionNotes: z.string().optional(),
  /** @deprecated superseded by accumulatedSeconds; accepted for old clients. */
  pausedTime: z.number().optional(),
  isTimerActive: z.boolean().optional(),
  /** Seconds of active training in already-finished segments. */
  accumulatedSeconds: z.number().optional(),
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
