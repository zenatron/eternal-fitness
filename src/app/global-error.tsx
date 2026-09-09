'use client';

/**
 * Last-resort boundary: renders when the error sits outside the root layout
 * itself (provider crash, layout throw). It must own <html>/<body> because no
 * layout renders around it, so this is deliberately dependency-light — no
 * providers, no framer-motion, no design tokens beyond inline styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('Global error caught by boundary:', error);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0c0a09',
          color: '#fafaf9',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '1.5rem',
          textAlign: 'center',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#a8a29e', margin: '0 0 1.5rem' }}>
            The app failed to start. Your logged data is safe.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: '#f97316',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
