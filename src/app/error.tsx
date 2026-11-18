'use client';

import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { StatusScreen } from '@/components/ui/StatusScreen';

/**
 * Route-level error boundary. Render crashes used to fall through to Next's
 * default production screen, which looked nothing like the app and offered no
 * way back — this keeps the FORGE shell and adds a retry without a full reload.
 * (Network/data failures are handled per-page by `ErrorState`; this catches the
 * crashes those cannot.)
 */
export default function ErrorBoundaryPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Surfaced for debugging; production builds strip non-error console calls.
  console.error('Render error caught by boundary:', error);

  return (
    <StatusScreen
      icon={ExclamationTriangleIcon}
      tone="danger"
      title="Something went wrong"
      actions={
        <>
          <button onClick={reset} className="btn btn-primary tap-control min-h-[44px] flex-1">
            Try again
          </button>
          <Link href="/" className="btn btn-tertiary tap-control min-h-[44px] flex-1">
            Go home
          </Link>
        </>
      }
    >
      <p>This screen hit an unexpected error. Your logged data is safe.</p>
    </StatusScreen>
  );
}
