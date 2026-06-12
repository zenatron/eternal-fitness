# Eternal Fitness

A personalized fitness application that helps users track, create, and maintain their workout routines.

## Features

- **Personalized Workout Creation:** Generate workout plans tailored to your fitness goals, preferred workout splits, and available time.
- **Progress Tracking:** Monitor your completed workouts, current weight, height, and other fitness metrics over time.
- **Dark/Light Theme Support:** Enjoy a comfortable user experience with automatic theme switching based on your device preferences.
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

## Tests

```bash
bun test
bun test:watch
```

## License

MIT
