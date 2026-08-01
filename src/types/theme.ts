/**
 * Accent themes.
 *
 * Each entry names a `[data-accent]` block in globals.css, which redefines the
 * `--accent-*` channel triplets that every `accent-*` Tailwind utility reads
 * through. Adding a theme is therefore two edits — one block of CSS variables
 * and one entry here — and touches no component.
 *
 * `swatch` is only for the picker UI. It is a literal value rather than an
 * `accent-*` class because the picker has to show all five themes at once,
 * while `--accent-*` only ever holds the active one.
 */

export const ACCENT_THEMES = [
  {
    id: 'forge',
    name: 'Forge',
    description: 'Molten amber. The original.',
    swatch: '#ed7b16',
  },
  {
    id: 'arctic',
    name: 'Arctic',
    description: 'Cold cyan, high contrast.',
    swatch: '#06b6d4',
  },
  {
    id: 'verdant',
    name: 'Verdant',
    description: 'Deep emerald green.',
    swatch: '#10b981',
  },
  {
    id: 'amethyst',
    name: 'Amethyst',
    description: 'Rich violet.',
    swatch: '#8b5cf6',
  },
  {
    id: 'steel',
    name: 'Steel',
    // Kept short deliberately: descriptions are one line in the picker, and
    // anything longer than about 34 characters truncates at phone width.
    description: 'Muted blue-grey.',
    swatch: '#64748b',
  },
] as const;

export type AccentTheme = (typeof ACCENT_THEMES)[number]['id'];

/** Tuple form, for `z.enum()` on the API side. */
export const ACCENT_THEME_IDS = ACCENT_THEMES.map((t) => t.id) as unknown as [
  AccentTheme,
  ...AccentTheme[],
];

export const DEFAULT_ACCENT: AccentTheme = 'forge';

/** Forge's base hue. Fallback for the canvases when CSS isn't readable yet. */
export const DEFAULT_ACCENT_HUE = 28;

/** Key in localStorage. Read by the pre-paint script in layout.tsx too. */
export const ACCENT_STORAGE_KEY = 'eternal-accent';

const IDS = new Set<string>(ACCENT_THEMES.map((t) => t.id));

/**
 * Anything that reaches the DOM or the database goes through this first — a
 * stale localStorage value or an old row must not be able to write an arbitrary
 * string into a `data-` attribute.
 */
export function isAccentTheme(value: unknown): value is AccentTheme {
  return typeof value === 'string' && IDS.has(value);
}

export function coerceAccentTheme(value: unknown): AccentTheme {
  return isAccentTheme(value) ? value : DEFAULT_ACCENT;
}

/**
 * Runs before first paint, inlined in <head>.
 *
 * next-themes does the equivalent for light/dark; this is the accent half. It
 * has to be a blocking inline script rather than anything React does, because
 * by the time the client bundle executes the page has already painted — and it
 * would have painted in the default orange regardless of the saved choice.
 *
 * Written as a string with no external references so it can be inlined as-is,
 * and wrapped in try/catch because localStorage throws outright in some
 * privacy modes.
 */
export const ACCENT_PREPAINT_SCRIPT = `(function(){try{var a=localStorage.getItem(${JSON.stringify(
  ACCENT_STORAGE_KEY
)});var v=${JSON.stringify(
  ACCENT_THEMES.map((t) => t.id)
)};document.documentElement.dataset.accent=v.indexOf(a)>-1?a:${JSON.stringify(
  DEFAULT_ACCENT
)};}catch(e){document.documentElement.dataset.accent=${JSON.stringify(DEFAULT_ACCENT)};}})();`;
