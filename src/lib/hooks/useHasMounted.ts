'use client';

import { useEffect, useState } from 'react';

/**
 * False during server render and the first client render, true afterwards.
 *
 * Needed because this app's pages are client components with client-only data:
 * the server can never have a profile or a workout history, so it always emits
 * a skeleton. Meanwhile the React Query cache is restored from IndexedDB, and
 * because pages sit inside a `<Suspense>` boundary React may defer hydrating
 * them until after that restore has landed — at which point the client renders
 * real content against server HTML that was a skeleton, and React throws the
 * whole tree away and re-renders it.
 *
 * Gating on this makes the first client render provably identical to the
 * server's, so hydration succeeds and the real content appears as an ordinary
 * update immediately after.
 */
export function useHasMounted(): boolean {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}
