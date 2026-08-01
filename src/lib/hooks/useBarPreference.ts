'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'eternal-bars';

/**
 * Which bar the plate calculator assumes, remembered per exercise.
 *
 * Per exercise rather than globally, because one lifter uses several bars in a
 * session: an Olympic bar to bench, an EZ bar to curl, a trap bar to deadlift.
 * A single stored preference meant correcting the bar on skull crushers
 * silently changed the maths on bench press too.
 *
 * Device-local, and deliberately not synced to the account like the accent
 * theme is: this describes the rack you are standing at. Someone who trains at
 * a commercial gym on weekdays and a garage gym at weekends wants a different
 * answer in each, and syncing would fight them.
 */
function readAll(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Anything else in this key is not ours; ignore rather than throw.
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function useBarPreference(exerciseKey: string, fallback: string) {
  const [barId, setBarId] = useState(fallback);

  // Read after mount rather than in an initialiser: this renders inside the
  // active-workout tree, and a first client render that disagreed with the
  // server's would cost a hydration pass.
  useEffect(() => {
    const stored = readAll()[exerciseKey];
    setBarId(stored ?? fallback);
  }, [exerciseKey, fallback]);

  const choose = useCallback(
    (next: string) => {
      setBarId(next);
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...readAll(), [exerciseKey]: next })
        );
      } catch {
        /* storage unavailable; in-memory for this session */
      }
    },
    [exerciseKey]
  );

  return [barId, choose] as const;
}
