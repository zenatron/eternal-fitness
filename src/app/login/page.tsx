'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

const devBypassEnabled =
  process.env.NEXT_PUBLIC_AUTH_DEV_BYPASS === 'true';
// Mirrors the server-side guard in lib/auth.ts: an unconfigured PocketID
// provider means the button would only lead to an error page. Defaults to
// enabled so existing deployments that never set the flag keep working.
const pocketIdEnabled =
  process.env.NEXT_PUBLIC_AUTH_POCKETID_ENABLED !== 'false';

/**
 * Where to go after signing in. The middleware sends signed-out visitors here
 * with `?callbackUrl=<where they were going>`, but sign-in never passed it on,
 * so every deep link (a shared /history link, a notification) landed on Home.
 * Only same-origin paths are honoured — never a protocol-relative "//host".
 */
function safeCallbackUrl(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/login')) return '/';
  return raw;
}

/** Auth.js error codes, in words a person can act on. */
function errorMessage(code: string | null): string | null {
  if (!code) return null;
  if (code === 'AccessDenied') return 'Your account is not allowed to sign in here.';
  if (code === 'Configuration') return 'Sign-in is not configured correctly on this server.';
  return 'Sign-in did not complete. Try again.';
}

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get('callbackUrl'));
  const error = errorMessage(params.get('error'));

  return (
    <div className="flex min-h-page items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-500">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </span>
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-surface-50 dark:text-white">
            Eternal Fitness
          </h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-600">Sign in to your training log.</p>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-700 dark:text-danger-300">
            {error}
          </p>
        )}

        <div className="space-y-3">
          {pocketIdEnabled && (
            <button onClick={() => signIn('pocketid', { callbackUrl })} className="btn btn-primary w-full min-h-[48px]">
              Sign in with PocketID
            </button>
          )}

          {devBypassEnabled && (
            <button
              onClick={() => signIn('dev-bypass', { email: 'dev@eternal-fitness.local', callbackUrl })}
              className="btn w-full min-h-[48px] border border-dashed border-warning-500/60 text-warning-700 hover:bg-warning-500/10 dark:text-warning-400"
            >
              Dev sign in
            </button>
          )}

          {!pocketIdEnabled && !devBypassEnabled && (
            <p className="text-center text-sm text-surface-500 dark:text-surface-600">
              No sign-in method is configured on this server.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary for static rendering.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
