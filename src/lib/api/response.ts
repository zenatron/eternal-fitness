import { NextResponse } from 'next/server';

/**
 * Shared JSON envelope for API routes. Every route used to carry a copy-pasted
 * pair of these helpers; the wire shape ({ data } / { error: { message,
 * details } }) is part of the client contract, so it lives in exactly one
 * place. `route` only labels the server-side log line.
 */
export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(message: string, status = 500, details?: unknown, route?: string) {
  console.error(
    `API Error (${status})${route ? ` [${route}]` : ''}:`,
    message,
    details ? JSON.stringify(details) : ''
  );
  /*
   * 5xx details can carry exception messages (connection strings, SQL fragments)
   * to the client; the log above already has them. Anything a route wants the
   * user to see should be a 4xx detail or the message itself. See
   * /api/auth/check, which pioneered this rule.
   */
  const safeDetails = status >= 500 && details && typeof details === 'object'
    ? Object.fromEntries(Object.entries(details as Record<string, unknown>).filter(([k]) => k !== 'error'))
    : details;
  return NextResponse.json(
    { error: Object.assign({ message }, safeDetails ? { details: safeDetails } : {}) },
    { status }
  );
}

/**
 * Parses and clamps a `limit` query param. Untrusted by construction: a
 * missing, non-numeric ("abc" → NaN, which must not reach SQL) or non-positive
 * value falls back to the clamped default; an absurd value ("999999") is
 * capped at `max`.
 */
export function parseLimitParam(raw: string | null, fallback = 50, max = 200): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}
