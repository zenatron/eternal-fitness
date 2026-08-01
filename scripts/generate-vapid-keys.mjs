/**
 * Generates the VAPID keypair used to sign Web Push messages.
 *
 *   bun run scripts/generate-vapid-keys.mjs
 *
 * Run once per deployment and put the output in .env. Regenerating the keys
 * invalidates every existing subscription — browsers tie a subscription to the
 * public key it was created with — so treat these as long-lived secrets.
 */
import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`
VAPID keys generated. Add these to your .env:

# Public key. Not a secret — the browser needs it to create a subscription, so
# every visitor receives it. Served at runtime by GET /api/push/subscribe, which
# is why it has no NEXT_PUBLIC_ prefix: keeping it out of the client bundle means
# rotating the keypair is a restart rather than an image rebuild.
VAPID_PUBLIC_KEY=${publicKey}

# Private key signs push messages — server-side only, never expose it.
VAPID_PRIVATE_KEY=${privateKey}

# Contact address required by the push services (mailto: or https:).
VAPID_SUBJECT=mailto:you@example.com

Note: changing these invalidates all existing push subscriptions.
`);
