'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  isAccentTheme,
  type AccentTheme,
} from '@/types/theme';

/**
 * Owns the active accent theme.
 *
 * Two stores, deliberately in this order:
 *
 *  - **localStorage** is the source of truth for what gets painted. It is
 *    readable synchronously, so `ACCENT_PREPAINT_SCRIPT` in layout.tsx can set
 *    `data-accent` before first paint and there is never a flash of the default
 *    orange.
 *  - **The user row** is the source of truth for what follows you to another
 *    device. It arrives a network round-trip late, which is exactly why it
 *    cannot be what we paint from.
 *
 * Reconciling them: whichever store has a value wins over one that doesn't, and
 * when both have a value the *local* one wins and is pushed up. That keeps a
 * choice made on this device from being silently reverted by a stale row, and
 * it means signing in on a fresh device adopts the account's theme rather than
 * overwriting it with the default.
 */

interface AccentContextValue {
  accent: AccentTheme;
  setAccent: (next: AccentTheme) => void;
}

const AccentContext = createContext<AccentContextValue>({
  accent: DEFAULT_ACCENT,
  setAccent: () => {},
});

export const useAccent = () => useContext(AccentContext);

function readStored(): AccentTheme | null {
  try {
    const raw = window.localStorage.getItem(ACCENT_STORAGE_KEY);
    return isAccentTheme(raw) ? raw : null;
  } catch {
    // Private mode / storage disabled. Fall back to the default; the app works,
    // the choice just doesn't persist.
    return null;
  }
}

function apply(accent: AccentTheme) {
  document.documentElement.dataset.accent = accent;
}

/**
 * useLayoutEffect on the client, useEffect on the server (where it is a no-op
 * and React would otherwise warn). The distinction matters below: the accent has
 * to be restored *before* the browser paints.
 */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function AccentProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const queryClient = useQueryClient();

  /*
   * Deliberately seeded with the default on both server and client rather than
   * read from localStorage or from the DOM.
   *
   * Reading the stored value here makes the first client render disagree with
   * the server's — the picker would mark a different radio as checked — and
   * React discards the whole tree with a hydration error. The stored value is
   * picked up in the layout effect below instead, one commit later.
   */
  const [accent, setAccentState] = useState<AccentTheme>(DEFAULT_ACCENT);

  // Guards the one-shot reconcile below, so a later profile refetch can't undo
  // a choice the user made after signing in.
  const reconciled = useRef(false);

  const persistRemote = useCallback(async (next: AccentTheme) => {
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accentTheme: next }),
      });
    } catch {
      // Offline, or the profile does not exist yet. The local value still
      // applies; the next change while online will carry it up.
    }
  }, []);

  const setAccent = useCallback(
    (next: AccentTheme) => {
      setAccentState(next);
      apply(next);
      try {
        window.localStorage.setItem(ACCENT_STORAGE_KEY, next);
      } catch {
        /* storage unavailable — in-memory only for this session */
      }
      if (status === 'authenticated') {
        void persistRemote(next);
        // Keep the cached profile honest, so a component reading
        // profile.accentTheme doesn't disagree with what is on screen.
        queryClient.setQueryData(['profile'], (old: unknown) =>
          old && typeof old === 'object' ? { ...old, accentTheme: next } : old
        );
      }
    },
    [status, persistRemote, queryClient]
  );

  /*
   * Re-applies the stored accent immediately after hydration.
   *
   * Two things make this necessary rather than redundant with the pre-paint
   * script. React reconciles the attributes it owns on <html> when it hydrates,
   * and strips `data-accent` because the server-rendered markup does not carry
   * it — measured: the attribute is present at first paint and gone once
   * hydration commits, dropping every colour back to the `:root` default. And
   * the state above starts at the default, so it has to be corrected anyway.
   *
   * A layout effect, not a plain one: this runs before the browser paints the
   * hydrated tree, so the restored accent is never visibly absent.
   */
  useIsomorphicLayoutEffect(() => {
    apply(readStored() ?? DEFAULT_ACCENT);
  }, []);

  /*
   * The React state catches up separately, in a passive effect.
   *
   * Setting it in the layout effect above re-rendered the picker while the rest
   * of the tree was still hydrating, which React reports as a text mismatch and
   * recovers from by throwing the tree away. Passive effects run after hydration
   * has finished, so this is safe — and the state is only read for the picker's
   * checked mark and the canvas dependency, neither of which needs to be correct
   * before the first paint the way the attribute does.
   */
  useEffect(() => {
    const stored = readStored();
    if (stored) setAccentState(stored);
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || reconciled.current) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok || cancelled) return;
        const remote = (await res.json())?.data?.accentTheme;
        if (cancelled) return;

        reconciled.current = true;
        const local = readStored();

        if (local) {
          // This device has an explicit choice. It wins, and travels up.
          if (local !== remote) void persistRemote(local);
        } else if (isAccentTheme(remote)) {
          // Fresh device, account has a preference: adopt it.
          setAccentState(remote);
          apply(remote);
          try {
            window.localStorage.setItem(ACCENT_STORAGE_KEY, remote);
          } catch {
            /* storage unavailable */
          }
        }
      } catch {
        // Offline. Whatever the pre-paint script applied stays.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, persistRemote]);

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>{children}</AccentContext.Provider>
  );
}
