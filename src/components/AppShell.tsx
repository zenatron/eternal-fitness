'use client';

import type { ReactNode } from 'react';

/**
 * Fixed application shell.
 *
 * The document itself used to scroll, which on a phone meant you could
 * rubber-band the whole page and drag empty space in above the header and below
 * the footer — the app visibly detaching from the viewport. `overscroll-behavior`
 * on `<body>` did not stop it, because the scrolling element is `<html>`.
 *
 * The layout is therefore inverted: `html`/`body` are locked to the viewport and
 * do not scroll at all (see globals.css), the chrome is a non-scrolling flex
 * item, and there is exactly one scroll container — `<main>` — with
 * `overscroll-contain` so its scroll never chains out to the document.
 *
 * A consequence worth knowing: the header no longer hides or shrinks on scroll.
 * Both effects were driven by `window.scrollY`, which no longer changes now that
 * the window does not scroll. A permanently visible compact header is the
 * conventional behaviour for an installed app anyway, and it removes the class
 * of bug where the chrome and the content disagree about scroll position.
 */
export function AppShell({
  chrome,
  children,
  footer,
}: {
  chrome: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div
        className="relative z-40 shrink-0 px-safe"
        // The safe-area inset is padding on the chrome container, so each bar
        // inside keeps its designed height instead of being squeezed by it.
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        {chrome}
      </div>

      <main
        className="relative z-10 flex-1 overflow-y-auto overscroll-y-contain scroll-touch"
        // Reserve exactly what the fixed nav occupies so the end of a page can
        // actually be scrolled to rather than sitting behind it.
        // --bottom-nav-total is 0 on desktop, where there is no nav.
        style={{ paddingBottom: 'var(--bottom-nav-total)' }}
      >
        {children}
        {footer}
      </main>
    </div>
  );
}
