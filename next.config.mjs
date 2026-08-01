import withSerwistInit from '@serwist/next';

/**
 * Serwist compiles src/app/sw.ts into public/sw.js and injects the precache
 * manifest. Disabled in development: the worker's caching makes hot reload
 * unreliable, and it is not compatible with Turbopack's dev server.
 */
const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  // The offline fallback must be in the precache or it is unreachable exactly
  // when it is needed.
  additionalPrecacheEntries: [{ url: '/offline', revision: null }],
  reloadOnOnline: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  allowedDevOrigins: ['logical-teal-deeply.ngrok-free.app', 'cachyos'],
  experimental: {
    // Rewrites barrel imports into deep per-icon imports. These packages export
    // thousands of components from a single index, and without this a single
    // `import { PlusIcon }` pulls a large chunk of the library into the bundle.
    optimizePackageImports: [
      '@heroicons/react/24/outline',
      '@heroicons/react/24/solid',
      '@heroicons/react/20/solid',
      'lucide-react',
      'react-icons',
      'framer-motion',
      'date-fns',
    ],
  },
  async headers() {
    return [
      {
        // The worker must be re-fetched on every load or a bad deploy is
        // permanently sticky. It also needs root scope to control the whole app.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        // Content-hashed and safe to keep forever.
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/splash/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
