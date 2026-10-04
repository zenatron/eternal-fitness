import { and, eq, lt, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

/**
 * Keyset pagination over (timestamp, id).
 *
 * A cursor on the timestamp alone skips a row whenever two sessions share a
 * completion instant — which happens for real (a completion and its offline
 * replay land in the same transaction). The id tiebreaker makes the cursor
 * total. Cursors are opaque strings end to end: the client round-trips
 * whatever the server emits, so the format can evolve. A bare ISO timestamp
 * (the pre-tiebreaker format) is still accepted as a timestamp-only filter.
 */

const SEPARATOR = '|';

export function encodeBeforeCursor(timestamp: Date, id: string): string {
  return `${timestamp.toISOString()}${SEPARATOR}${id}`;
}

export function buildBeforeCursorFilter(
  raw: string | null | undefined,
  timestampColumn: AnyPgColumn,
  idColumn: AnyPgColumn
): SQL | undefined {
  if (!raw) return undefined;

  let beforeDate: Date | null = null;
  let beforeId: string | null = null;

  const sep = raw.lastIndexOf(SEPARATOR);
  if (sep > 0) {
    const iso = raw.slice(0, sep);
    if (!Number.isNaN(Date.parse(iso))) {
      beforeDate = new Date(iso);
      beforeId = raw.slice(sep + 1) || null;
    }
  }
  if (!beforeDate && !Number.isNaN(Date.parse(raw))) {
    beforeDate = new Date(raw);
  }
  if (!beforeDate) return undefined;

  if (beforeId) {
    return or(
      lt(timestampColumn, beforeDate),
      and(eq(timestampColumn, beforeDate), lt(idColumn, beforeId))
    );
  }
  return lt(timestampColumn, beforeDate);
}
