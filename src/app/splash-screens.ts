/**
 * iOS ignores the web app manifest for launch images, so every device size needs
 * its own <link rel="apple-touch-startup-image"> with an exact media query.
 * Bitmaps are produced by scripts/generate-icons.mjs.
 */

/**
 * Master switch for emitting `apple-touch-startup-image` <link> tags.
 *
 * DISABLED (v3.5.8) while diagnosing the installed-iOS-PWA bottom band — see
 * the handoff brief `ios-pwa-viewport-brief.md`. The measurement on an iPhone
 * 16 Pro (402×874pt, dpr 3) is:
 *
 *   screen.height         874
 *   innerHeight           812   (= 874 − 62, the top inset)
 *   inset-top             62px
 *   inset-bottom          34px
 *
 * i.e. the standalone web view is top-anchored (black-translucent is honored for
 * origin) but only 812px tall, leaving a 62px band at the bottom that is outside
 * the document and therefore unreachable by any CSS. `viewport-fit=cover` is
 * being applied (the insets come back non-zero), so this is not a missing-cover
 * problem; something is capping the web-view height at `screen − top-inset`.
 *
 * The leading hypothesis: with `apple-touch-startup-image` links present but
 * NONE matching this device (the list below stops at 393×852 / 430×932; there is
 * no 402×874 entry), iOS falls back to a legacy web-view size — and 812 is
 * exactly the height of the `iphone-x` entry that *is* declared. The working
 * reference PWA (`budget-app` / "Ledger") on the same phone emits zero
 * startup-image links and shows no band.
 *
 * The modern entries (402×874, 440×956, …) and their bitmaps are now in place,
 * so the single-variable experiment can be re-run: set EMIT_SPLASH_LINKS=true
 * in the environment, redeploy, delete/re-add the home-screen icon, and confirm
 * innerHeight → 874 via the SafeAreaDebug overlay before flipping the default.
 */
export const EMIT_SPLASH_LINKS = process.env.EMIT_SPLASH_LINKS === 'true';

export interface SplashScreen {
  /** Logical CSS width of the device in points. */
  width: number;
  /** Logical CSS height of the device in points. */
  height: number;
  /** Device pixel ratio the bitmap was rendered for. */
  ratio: number;
  /** Basename under /splash. */
  name: string;
}

export const SPLASH_SCREENS: SplashScreen[] = [
  // Modern devices first, matching scripts/generate-icons.mjs. A device that
  // finds link tags but no matching entry falls back to a legacy web-view
  // height — the leading hypothesis for the bottom-band bug.
  { width: 402, height: 874, ratio: 3, name: 'iphone-16-pro' },
  { width: 440, height: 956, ratio: 3, name: 'iphone-16-pro-max' },
  { width: 393, height: 852, ratio: 3, name: 'iphone-15-pro' },
  { width: 430, height: 932, ratio: 3, name: 'iphone-15-pro-max' },
  { width: 390, height: 844, ratio: 3, name: 'iphone-13' },
  { width: 428, height: 926, ratio: 3, name: 'iphone-13-pro-max' },
  { width: 375, height: 812, ratio: 3, name: 'iphone-x' },
  { width: 414, height: 896, ratio: 3, name: 'iphone-xs-max' },
  { width: 414, height: 896, ratio: 2, name: 'iphone-xr' },
  { width: 375, height: 667, ratio: 2, name: 'iphone-8' },
  { width: 414, height: 736, ratio: 3, name: 'iphone-8-plus' },
  { width: 1032, height: 1376, ratio: 2, name: 'ipad-pro-13-m4' },
  { width: 820, height: 1180, ratio: 2, name: 'ipad-air-11' },
  { width: 768, height: 1024, ratio: 2, name: 'ipad' },
  { width: 834, height: 1112, ratio: 2, name: 'ipad-pro-10' },
  { width: 834, height: 1194, ratio: 2, name: 'ipad-pro-11' },
  { width: 1024, height: 1366, ratio: 2, name: 'ipad-pro-12' },
];

export function splashMediaQuery({ width, height, ratio }: SplashScreen): string {
  return `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`;
}
