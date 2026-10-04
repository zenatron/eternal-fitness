'use client';

import { ThemeProvider } from 'next-themes';
import { QueryClient, useQueryClient, type QueryClientConfig } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { SessionProvider, useSession } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createQueryPersister,
  markHydrated,
  PERSIST_BUSTER,
  PERSIST_MAX_AGE,
} from '@/lib/offline/queryPersister';
import { HAD_SESSION_MARKER, wipeClientOfflineState } from '@/lib/offline/reset';
import { TimeZoneSync } from '@/components/TimeZoneSync';

const queryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      // Long enough to survive being backgrounded for a whole workout, and to
      // give the persister something worth restoring on a cold launch.
      gcTime: 1000 * 60 * 60 * 24,
      // Was 'always', which fired a refetch storm every time the app came back
      // from the lock screen — expensive on mobile data and on battery. `true`
      // still refetches, but only once the data is actually stale.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // Pointless to attempt while offline: fail fast to the cached value and
      // let the outbox handle durability of writes.
      networkMode: 'offlineFirst',
      retry: (failureCount, error) => {
        // Don't burn retries on errors a retry cannot fix.
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 3;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 1,
    },
  },
};

/** Stand-in when IndexedDB is unavailable, so persistence silently disables. */
const noopPersister = {
  persistClient: async () => {},
  restoreClient: async () => undefined,
  removeClient: async () => {},
};

/**
 * Wipes every piece of client state that is keyed to "whoever is signed in"
 * when that person signs out — the outbox, the active workout, the persisted
 * query cache, the accent theme. Without this, a queued offline completion
 * replayed under the next user's cookie was credited to THEM, and user B could
 * browse user A's cached history offline. See lib/offline/reset.ts.
 */
function SignOutWipeGuard() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const prevStatusRef = useRef(status);

  useEffect(() => {
    const previous = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === 'authenticated') {
      try {
        window.localStorage.setItem(HAD_SESSION_MARKER, '1');
      } catch {}
      return;
    }

    if (status !== 'unauthenticated') return;

    // Two triggers: a live sign-out (authenticated → unauthenticated) and a
    // cold load already signed out that still finds the marker — the browser
    // may have died between sign-out and wipe.
    const wasAuthenticated = previous === 'authenticated';
    let markerPresent = false;
    try {
      markerPresent = window.localStorage.getItem(HAD_SESSION_MARKER) === '1';
    } catch {}

    if (!wasAuthenticated && !markerPresent) return;

    void (async () => {
      await wipeClientOfflineState();
      // Empty the in-memory cache too; the persister re-hydrates from the
      // (now empty) database on the next sign-in.
      queryClient.clear();
    })();
  }, [status, queryClient]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient(queryConfig));

  // Undefined where IndexedDB is unavailable (private browsing); the provider
  // then falls back to the no-op and behaves like a plain QueryClientProvider.
  const persister = useMemo(() => createQueryPersister(), []);

  // Releases the restore gate in queryPersister — see markHydrated. Runs after
  // the first commit, which is exactly when hydration is complete.
  useEffect(() => {
    markHydrated();
    // Ask the browser to keep our storage. Without `persist()`, IndexedDB in a
    // non-installed browser is "best effort" and can be evicted under storage
    // pressure — silently discarding the source of truth for offline logging.
    // Graceful everywhere: rejected promises are ignored.
    if (typeof navigator !== 'undefined' && 'storage' in navigator && 'persist' in navigator.storage) {
      void navigator.storage.persist().catch(() => {});
    }
  }, []);

  return (
    <SessionProvider>
      <TimeZoneSync />
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: persister ?? noopPersister,
          maxAge: PERSIST_MAX_AGE,
          buster: PERSIST_BUSTER,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              // Never persist the active workout: IndexedDB owns that state
              // directly (lib/offline/db.ts) and a stale cached copy could
              // resurrect a workout the user already finished.
              const key = String(query.queryKey[0] ?? '');
              if (key.startsWith('activeWorkout')) return false;
              return query.state.status === 'success';
            },
          },
        }}
        onSuccess={() => {
          /*
           * The restored cache carries its original `dataUpdatedAt`, so queries
           * written under staleTime count as fresh on a cold launch — a workout
           * finished elsewhere (or a template deleted and its totals unwound)
           * stayed invisible behind a "fresh" cache until the staleTime lapsed.
           * Restored data is a snapshot, not a guarantee: mark it all stale
           * once. Mounted queries refetch immediately; the rest refetch on
           * mount. Offline this fails silently back to the cache, which is the
           * whole point of persisting it.
           */
          void queryClient.invalidateQueries();
        }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          enableColorScheme={false}
        >
          {/* Needs both the session (status flips) and the query client (to
              clear the in-memory cache), so it lives inside both providers. */}
          <SignOutWipeGuard />
          {children}
          <Toaster
            position="top-center"
            containerStyle={{
              // Clear the notch and the sticky header in standalone mode.
              top: 'calc(var(--safe-top) + 4.5rem)',
            }}
            toastOptions={{
              duration: 4000,
              className: 'font-body',
              style: {
                background: '#1a1918',
                color: '#fff',
                border: '1px solid #2f2d2a',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                maxWidth: '90vw',
              },
              success: {
                iconTheme: { primary: 'rgb(var(--accent-500))', secondary: '#fff' },
              },
              error: {
                duration: 6000,
                iconTheme: { primary: 'rgb(var(--danger-500))', secondary: '#fff' },
              },
            }}
          />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </SessionProvider>
  );
}
