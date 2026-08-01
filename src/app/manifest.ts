import type { MetadataRoute } from 'next';

/**
 * Served at /manifest.webmanifest. Note that middleware.ts must let this path
 * through unauthenticated — the browser fetches it without credentials, and an
 * auth redirect here makes the app silently non-installable.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Eternal Fitness',
    short_name: 'Eternal',
    description:
      'Track workouts, break records, and keep the streak alive. Works offline — log a full session with no signal.',
    id: '/',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    // No display_override. It used to list 'window-controls-overlay' first,
    // which is a desktop-only mode meaning "draw content to the top of the
    // window and reserve a strip for window controls" — and display_override
    // outranks `display`, so that was the mode being requested everywhere,
    // phones included. It matches the measured symptom exactly: on an iPhone
    // the viewport started at y=0 but ran 62px short of the 874px screen,
    // leaving a band along the bottom that was outside the document and so
    // unreachable by any amount of CSS.

    orientation: 'portrait',
    background_color: '#0a0a09',
    theme_color: '#0a0a09',
    categories: ['health', 'fitness', 'lifestyle', 'sports'],
    dir: 'ltr',
    lang: 'en',
    icons: [
      { src: '/icons/icon-48.png', sizes: '48x48', type: 'image/png' },
      { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png' },
      { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
      { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
      { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
      { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-256.png', sizes: '256x256', type: 'image/png' },
      { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/monochrome.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'monochrome' },
    ],
    shortcuts: [
      {
        name: 'Start a workout',
        short_name: 'Start',
        description: 'Pick a template and start lifting',
        url: '/templates?source=shortcut',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Log past workout',
        short_name: 'Log',
        description: 'Record a session you already finished',
        url: '/session/log?source=shortcut',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Progress',
        short_name: 'Progress',
        description: 'Volume, frequency and personal records',
        url: '/progress?source=shortcut',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
    prefer_related_applications: false,
  };
}
