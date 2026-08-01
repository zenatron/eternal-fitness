'use client';

import { useEffect, useState } from 'react';

/**
 * On-device readout for the bottom-nav gap.
 *
 * Every fix for that gap so far has been reasoned from what iOS is documented
 * to do, and every one has been wrong, because nothing here has ever measured
 * what it actually does. This renders the numbers that distinguish the
 * remaining explanations from each other:
 *
 *  - viewport shorter than the screen  → the web view is inset and the strip is
 *    outside the document entirely; only iOS can paint it.
 *  - inset reported as 0 while the bar still floats → the gap is not the safe
 *    area at all and every safe-area change has been aimed at the wrong thing.
 *  - nav bottom above the viewport bottom → a layout problem in our own tree,
 *    nothing to do with iOS.
 *
 * Opt-in, so it never appears for a normal user: either ?debug=safearea, or
 * seven taps on the version in the footer. The second exists because an
 * installed PWA has no URL bar — there is no way to hand-edit a query string
 * once the app is on the home screen, which is exactly where the bug lives.
 *
 * Delete this file once the gap is understood.
 */

/** Shared with the footer's tap-to-enable. */
export const DEBUG_KEY = 'ef-debug-safearea';
/** Fired by the footer so the overlay appears without a reload. */
export const DEBUG_EVENT = 'ef-debug-toggle';

export function SafeAreaDebug() {
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [enabled, setEnabled] = useState(false);

  // Read the flag on mount and whenever the footer toggles it. Split from the
  // measuring effect so toggling does not re-register the resize listeners.
  useEffect(() => {
    const read = () =>
      setEnabled(
        new URLSearchParams(window.location.search).has('debug') ||
          localStorage.getItem(DEBUG_KEY) === '1'
      );
    read();
    window.addEventListener(DEBUG_EVENT, read);
    return () => window.removeEventListener(DEBUG_EVENT, read);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setRows(null);
      return;
    }

    const measure = () => {
      // env() is only readable by letting the engine resolve it into a real
      // length on a real element, so probe with one rather than trying to parse
      // the custom property.
      const probe = document.createElement('div');
      probe.style.cssText =
        'position:fixed;left:-9999px;padding-top:env(safe-area-inset-top,0px);' +
        'padding-bottom:env(safe-area-inset-bottom,0px);';
      document.body.appendChild(probe);
      const probed = getComputedStyle(probe);
      const insetTop = probed.paddingTop;
      const insetBottom = probed.paddingBottom;
      probe.remove();

      const nav = document.querySelector('nav[aria-label="Primary"]');
      const navRect = nav?.getBoundingClientRect();
      const vv = window.visualViewport;
      const root = document.documentElement;

      // The load-bearing number: how far the bar's painted bottom edge is from
      // the bottom of the layout viewport. If the gap is inside the document
      // this is 0 and the black band is something else entirely.
      const navGap = navRect
        ? (window.innerHeight - navRect.bottom).toFixed(1)
        : 'no nav';

      // Self-verifying rows for the v3.5.8 single-variable test: confirm the
      // splash links are actually gone (so a stale install isn't fooling us)
      // and that the viewport meta is unchanged (so maximum-scale is still the
      // next suspect, not a confounder introduced here).
      const splashLinkCount = document.querySelectorAll(
        'link[rel="apple-touch-startup-image"]'
      ).length;
      const viewportMeta =
        document
          .querySelector('meta[name="viewport"]')
          ?.getAttribute('content') ?? 'n/a';

      setRows([
        ['standalone', String((navigator as { standalone?: boolean }).standalone)],
        [
          'display-mode',
          window.matchMedia('(display-mode: standalone)').matches
            ? 'standalone'
            : 'browser',
        ],
        ['inset-top', insetTop],
        ['inset-bottom', insetBottom],
        ['innerHeight', String(window.innerHeight)],
        ['clientHeight', String(root.clientHeight)],
        ['screen.height', String(window.screen.height)],
        ['visualViewport.h', vv ? vv.height.toFixed(1) : 'n/a'],
        ['vv.offsetTop', vv ? vv.offsetTop.toFixed(1) : 'n/a'],
        ['dpr', String(window.devicePixelRatio)],
        ['nav.bottom', navRect ? navRect.bottom.toFixed(1) : 'n/a'],
        ['nav.height', navRect ? navRect.height.toFixed(1) : 'n/a'],
        ['viewport - nav.bottom', navGap],
        ['splash-links', String(splashLinkCount)],
        ['viewport-meta', viewportMeta],
      ]);
    };

    measure();
    // Rotation and the URL bar collapsing both change these.
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [enabled]);

  if (!rows) return null;

  return (
    <div
      // Anchored to the top: the whole point is to observe the bottom of the
      // screen, so this must not cover it.
      className="fixed inset-x-0 top-0 z-[9999] bg-black/90 p-2 font-mono text-[10px] leading-tight text-success-400"
    >
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-2">
          <span className="opacity-60">{label}</span>
          <span>{value}</span>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          localStorage.removeItem(DEBUG_KEY);
          window.dispatchEvent(new Event(DEBUG_EVENT));
        }}
        className="mt-1 w-full border-t border-success-400/30 pt-1 text-center uppercase tracking-wide opacity-60"
      >
        tap to dismiss
      </button>
    </div>
  );
}
