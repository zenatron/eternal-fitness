'use client';

import { ThemeProvider } from 'next-themes';
import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { useEffect, useMemo, useState } from 'react';
import {
  createQueryPersister,
  markHydrated,
  PERSIST_BUSTER,
  PERSIST_MAX_AGE,
} from '@/lib/offline/queryPersister';

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

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient(queryConfig));

  // Undefined where IndexedDB is unavailable (private browsing); the provider
  // then falls back to the no-op and behaves like a plain QueryClientProvider.
  const persister = useMemo(() => createQueryPersister(), []);

  // Releases the restore gate in queryPersister — see markHydrated. Runs after
  // the first commit, which is exactly when hydration is complete.
  useEffect(() => {
    markHydrated();
  }, []);

  return (
    <SessionProvider>
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
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          enableColorScheme={false}
        >
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
