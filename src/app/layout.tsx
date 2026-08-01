import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Oswald, Manrope } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { ThemeHandler } from '@/components/theme/ThemeHandler';
import { AccentProvider } from '@/components/theme/AccentProvider';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import ActiveWorkoutIndicator from '@/components/workout/ActiveWorkoutIndicator';
import { ActiveWorkoutProvider } from '@/components/workout/ActiveWorkoutProvider';
import { RestTimerProvider } from '@/components/workout/RestTimerProvider';
import { RestTimerBar } from '@/components/workout/RestTimerBar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar';
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { SafeAreaDebug } from '@/components/pwa/SafeAreaDebug';
import { SPLASH_SCREENS, splashMediaQuery, EMIT_SPLASH_LINKS } from './splash-screens';
import { ACCENT_PREPAINT_SCRIPT } from '@/types/theme';

const displayFont = Oswald({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  applicationName: 'Eternal Fitness',
  title: {
    default: 'Eternal Fitness',
    template: '%s · Eternal Fitness',
  },
  description:
    'Track workouts, break records, and keep the streak alive. Works offline — log a full session with no signal.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Eternal',
    // `default`, not `black-translucent`. With `black-translucent` the
    // standalone iOS web view is top-anchored (y=0, under the notch) but its
    // height is capped at screen − safe-area-inset-top, leaving a bottom band
    // outside the document that no CSS can reach. `default` places the web
    // view below the status bar and extends it to the physical screen bottom,
    // eliminating the gap. Tradeoff: the app no longer paints behind the
    // status bar — the forge background starts below it, not edge to edge.
    // See ios-pwa-viewport-brief.md for the full measurement trail.
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  // Phone-number autolinking mangles set/rep numbers into tel: links on iOS.
  formatDetection: { telephone: false },
  // `mobile-web-app-capable` is not listed here: appleWebApp.capable already
  // emits it, and duplicating it put the tag in the head twice.
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Allow zoom: pinching to read a chart mid-workout is a real need, and locking
  // it out is an accessibility failure.
  maximumScale: 5,
  userScalable: true,
  // Paint into the notch/home-indicator area; safe-area padding is handled in CSS.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a09' },
    { media: '(prefers-color-scheme: light)', color: '#fef7ee' },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${displayFont.variable} ${bodyFont.variable}`}>
      <head>
        {/*
          Written by hand because Next 15 no longer emits it: `appleWebApp.capable`
          now produces the standard `mobile-web-app-capable`, which iOS ignores.
          There is no metadata field left that outputs the apple-prefixed name.

          It is not redundant with the manifest's `display: standalone`. iOS uses
          the manifest to decide the app launches without browser chrome, but
          keys the *safe-area* behaviour off this tag: without it the web view is
          inset above the home indicator and iOS paints the leftover strip
          itself, so `viewport-fit=cover` has no effect there and the insets
          report 0. That strip is outside the document, which is why no amount of
          padding, background-bleed or canvas colour on our side could fill it —
          it showed as a black band under the bottom nav.

          Also a prerequisite for `statusBarStyle: 'default'` above, which
          iOS only honours when this tag is present.
        */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Applies the saved accent theme before the first paint. See the
            comment on ACCENT_PREPAINT_SCRIPT for why this cannot be done in
            React. Content is a build-time constant, never user input. */}
        <script dangerouslySetInnerHTML={{ __html: ACCENT_PREPAINT_SCRIPT }} />
        <meta name="view-transition" content="same-origin" />
        {/* iOS launch images — no manifest equivalent exists, so each size is
            explicit. Gated by EMIT_SPLASH_LINKS (currently false): see the
            comment on that constant in splash-screens.ts for the full diagnosis
            of the standalone viewport-height bug. Re-enable only after adding
            modern device entries (402×874, 440×956, …) and confirming
            innerHeight reads 874 on the installed PWA. */}
        {EMIT_SPLASH_LINKS &&
          SPLASH_SCREENS.map((screen) => (
            <link
              key={screen.name}
              rel="apple-touch-startup-image"
              href={`/splash/${screen.name}.png`}
              media={splashMediaQuery(screen)}
            />
          ))}
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <ThemeHandler>
            <AccentProvider>
            {/* One workout store for the whole app: the global indicator and the
                session page both read from this, so they can never disagree. */}
            <ActiveWorkoutProvider>
              {/* Above the page so a rest countdown survives navigation — you
                  can check the dashboard mid-rest without losing the timer. */}
              <RestTimerProvider>
                <AnimatedBackground />
                {/* Fixed shell: only <main> scrolls, so the page can no longer
                    be dragged away from the viewport edges. */}
                <AppShell
                  chrome={
                    <>
                      <Header />
                      <OfflineIndicator />
                      <ActiveWorkoutIndicator />
                    </>
                  }
                  footer={<Footer />}
                >
                  {children}
                </AppShell>
                <BottomNav />
                <RestTimerBar />
                <ServiceWorkerRegistrar />
                <InstallPrompt />
                <SafeAreaDebug />
              </RestTimerProvider>
            </ActiveWorkoutProvider>
            </AccentProvider>
          </ThemeHandler>
        </Providers>
      </body>
    </html>
  );
}
