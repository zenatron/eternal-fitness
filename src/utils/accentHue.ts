import { DEFAULT_ACCENT_HUE } from '@/types/theme';

/**
 * Reads the active theme's base hue out of CSS.
 *
 * The particle systems build their colours in JS with `hsla()`, so they cannot
 * go through a Tailwind class the way the rest of the app does. Rather than
 * duplicating the palette in TypeScript — which would then drift from
 * globals.css the first time a theme is tweaked — each `[data-accent]` block
 * publishes `--accent-hue` and this reads it back.
 *
 * Returns the Forge hue if the variable is missing or unparseable, which covers
 * SSR and the window between the pre-paint script and stylesheet application.
 */
export function readAccentHue(): number {
  if (typeof window === 'undefined') return DEFAULT_ACCENT_HUE;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent-hue');
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : DEFAULT_ACCENT_HUE;
}
