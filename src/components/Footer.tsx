'use client';

import Link from 'next/link';
import { useRef } from 'react';
import toast from 'react-hot-toast';
import pkg from '../../package.json';
import { DEBUG_KEY, DEBUG_EVENT } from './pwa/SafeAreaDebug';

/** Taps on the version needed to reveal the safe-area readout. */
const DEBUG_TAPS = 7;

/** One quiet line under every page — it used to be an animated, tinted band. */
export function Footer() {
  const taps = useRef(0);

  // The installed app has no URL bar, so ?debug= is unreachable exactly where
  // the layout bug reproduces. Tapping the build number is the standard escape
  // hatch for that, and costs no settings UI. Remove with SafeAreaDebug.
  const handleVersionTap = () => {
    taps.current += 1;
    if (taps.current < DEBUG_TAPS) {
      // Only hint near the end, so an accidental double-tap stays silent.
      if (taps.current >= DEBUG_TAPS - 3) {
        toast(`${DEBUG_TAPS - taps.current} more…`, { duration: 800 });
      }
      return;
    }
    taps.current = 0;
    localStorage.setItem(DEBUG_KEY, '1');
    window.dispatchEvent(new Event(DEBUG_EVENT));
    toast.success('Safe-area readout enabled');
  };

  return (
    <footer style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom))' }} className="px-safe pt-10">
      <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 text-xs text-surface-500 dark:text-surface-600 sm:px-6">
        <span>Eternal Fitness</span>
        <span aria-hidden="true">·</span>
        <Link href="https://github.com/zenatron" className="hover:text-accent-600 dark:hover:text-accent-400">
          zenatron
        </Link>
        <span aria-hidden="true">·</span>
        <button type="button" onClick={handleVersionTap} className="tap-control font-mono">
          v{pkg.version}
        </button>
      </p>
    </footer>
  );
}
