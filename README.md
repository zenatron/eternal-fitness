# Eternal Fitness

A personalized fitness application that helps users track, create, and maintain their workout routines.

## Features

- **Personalized Workout Creation:** Generate workout plans tailored to your fitness goals, preferred workout splits, and available time.
- **Barbell Tools:** Plate loading per side for any barbell lift, with the bar remembered per exercise, plus an estimated 1RM on every set so progress is visible without doing the arithmetic.
- **Recovery Map:** A body heatmap of which muscles are still recovering, estimated from your logged sets — front and back views, tap any muscle for detail, plus ready-to-train and still-recovering lists.
- **Training Suggestions:** Your own workouts ranked against how recovered you are, so "what should I train today" has an answer you can act on in one tap. A note appears next to Start Workout when a session targets muscles that haven't recovered.
- **Progress Tracking:** Monitor your completed workouts, current weight, height, and other fitness metrics over time.
- **Per-Exercise History:** Every lift gets its own page — estimated-1RM, heaviest-set and volume trends over time, its personal records, and the full session list. Reachable by tapping any exercise name in a records list.
- **Theming:** Dark and light modes, plus five accent themes (Forge, Arctic, Verdant, Amethyst, Steel) that follow you across devices. See [Design System](#design-system).
- **Responsive Design:** Access your fitness data on any device with a fully responsive interface.
- **Self-Hosted Authentication:** Secure login through PocketID (OIDC) with Auth.js.
- **Unit Conversion:** Toggle between metric and imperial measurements based on your preference.

## Installation

### Docker (Recommended)

```bash
# Copy the example env and fill in your values
cp .env.example .env

# Generate a secret for Auth.js (required)
# Use: openssl rand -base64 32

# Start the application and database
docker compose up -d
```

### Manual Development

**Requirements:** Bun, PostgreSQL

```bash
cp .env.example .env  # Fill in your values
bun install
bun run db:migrate
bun run dev
```

The application will be available at `http://localhost:3000`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Random secret for JWT signing (`openssl rand -base64 32`) |
| `AUTH_URL` | Yes | Public URL of the application (e.g. `https://fitness.example.com`) |
| `AUTH_POCKETID_ID` | Yes | OIDC client ID from PocketID |
| `AUTH_POCKETID_SECRET` | Yes | OIDC client secret from PocketID |
| `AUTH_POCKETID_ISSUER` | Yes | PocketID issuer URL (e.g. `https://auth.example.com`) |

## Auth Setup

Eternal Fitness uses [PocketID](https://pocket-id.org) as the OIDC identity provider via [Auth.js](https://authjs.dev).

1. Set up a PocketID instance (see [PocketID docs](https://pocket-id.org/docs))
2. In the PocketID admin UI, create an OIDC client with these settings:
   - **Redirect URI:** `https://your-domain.com/api/auth/callback/pocketid`
   - **Grant types:** `authorization_code`
   - **Scopes:** `openid`, `profile`, `email`
3. Copy the client ID and secret into your `.env`

## Tech Stack

- [Next.js](https://nextjs.org/) — React framework
- [Auth.js](https://authjs.dev) — Authentication
- [PocketID](https://pocket-id.org) — Self-hosted OIDC provider
- [Drizzle ORM](https://orm.drizzle.team) — Database ORM (PostgreSQL)
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [Framer Motion](https://www.framer.com/motion) — Animations

## Progressive Web App

The app installs to the home screen and is offline-first: a whole workout can be
logged with no signal.

### How offline works

- **IndexedDB is the source of truth** for an in-progress workout
  (`src/lib/offline/db.ts`). Every set is written locally before any network
  call, so nothing is lost to a dropped connection, a killed tab, or a crash.
- **Failed mutations go to an outbox** (`src/lib/offline/outbox.ts`) and are
  replayed by the service worker's Background Sync handler when connectivity
  returns — even with no tab open. Safari and Firefox lack Background Sync, so
  the page drains the queue itself on the `online` event.
- **Completions are idempotent.** The client sends a stable `Idempotency-Key`
  derived from the session, and the server records it (`src/lib/idempotency.ts`)
  so a replayed request cannot double-log a workout.
- **The React Query cache is persisted** to IndexedDB, so a cold launch with no
  network paints real data instead of empty skeletons.

### Service worker

Written in `src/app/sw.ts` and compiled to `public/sw.js` by `@serwist/next` at
build time (`public/sw.js` is generated — do not edit or commit it). Disabled in
development.

Updates are never applied silently: `skipWaiting` is off, and the user is
prompted, so a new build cannot reload the page mid-workout.

### Regenerating icons

Icons, maskable icons, the favicon and iOS splash screens are all generated from
one vector source:

```bash
bun run scripts/generate-icons.mjs
```

### Push notifications (optional)

Push is off unless VAPID keys are configured; the app degrades gracefully and
hides the toggle.

```bash
bun run scripts/generate-vapid-keys.mjs
```

Put the output in `.env`. All three variables are plain runtime config — the
public key is served to the browser by `GET /api/push/subscribe` rather than
inlined into the client bundle, so the same image runs against any environment
and rotating the keypair only needs a restart.

Note that regenerating the keys invalidates every existing subscription.

## Maintenance Scripts

| Command | What it does |
|---------|--------------|
| `bun run db:migrate` | Applies pending Drizzle migrations. Also run automatically by the container entrypoint. |
| `bun run db:backfill-e1rm` | Backfills estimated-1RM personal records from existing session history, for data logged before that record type existed. Dry-run by default; pass `--write` to apply. Idempotent — it only ever raises a record. |
| `bun run db:fix-points` | One-off correction for historically inflated achievement points. |

## Design System

All colour flows through CSS custom properties, so themes are a data change
rather than a code change. Nothing in a component hardcodes a hue.

### Tokens

Tailwind colours are defined in `tailwind.config.js` as
`rgb(var(--<token>-<shade>) / <alpha-value>)`, and the values live in
`src/app/globals.css`. The `<alpha-value>` placeholder is what keeps
`bg-accent-500/20` working, which is why the variables hold bare `R G B`
triplets rather than finished `rgb()` strings.

| Token | Themeable | Use |
|---|---|---|
| `accent-*` | **yes** | Brand. Primary actions, active nav, links, focus rings, decorative gradients. |
| `success-*` | no | Completed sets, positive deltas, confirmations. |
| `danger-*` | no | Destructive actions and errors. |
| `warning-*` | no | Caution: paused timer, skipped sets, "template modified". |
| `award-*` | no | Gold. Trophies, PRs, achievements, XP, favourites. |
| `info-*` | no | Neutral informational states. |
| `surface-*` | no | Backgrounds, borders, body text. **Inverted scale** — `surface-0` is near-black and `surface-950` is cream, so `text-surface-50` is a *dark* value used in light mode. |

Status colours are deliberately fixed: a success badge that changed hue with the
accent would stop meaning "success".

### Adding an accent theme

Two edits, no component changes:

1. Add a `[data-accent='<id>']` block in `globals.css` defining `--accent-50`
   through `--accent-950` plus `--accent-hue` (the base hue, read by the canvas
   particle systems, which build colour in JS and cannot go through a class).
2. Add an entry to `ACCENT_THEMES` in `src/types/theme.ts`.

Check contrast before shipping one. White text sits on `accent-600`–`accent-800`
in `.greeting-gradient` and on the victory button, so those shades need to clear
4.5:1 against white; `accent-400` is the dark-mode text/icon shade and needs to
clear 4.5:1 against `surface-0` (#0a0a09) and `surface-100` (#1a1918).

### Deliberate exceptions

Two places use raw palette values on purpose, because a gold/silver/bronze
ladder only reads as one if the medals keep their own colours:

- `TIER_COLORS` in `src/types/achievements.ts`
- `MEDAL_COLORS` in `src/app/leaderboard/page.tsx`

### How a theme is applied

`data-accent` on `<html>`. An inline pre-paint script in `layout.tsx` sets it
from `localStorage` before first paint; `AccentProvider` restores it after
hydration (React strips the attribute while reconciling `<html>`) and syncs the
choice to `users.accent_theme` when signed in. Local wins over the stored row,
so a choice made on this device is never reverted by a stale one.

## Tests

```bash
bun test
bun test:watch
```

## License

MIT
