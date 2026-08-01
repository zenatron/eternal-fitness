'use client';

/**
 * The app's loading spinner.
 *
 * This exact SVG was inlined in the profile editor twice and the setup form
 * once, with the same two paths and the same magic `d` attribute each time.
 */
export function Spinner({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
