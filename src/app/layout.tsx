import './globals.css';
import type { Metadata } from 'next';
import { Oswald, Manrope } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { ThemeHandler } from '@/components/theme/ThemeHandler';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import ActiveWorkoutIndicator from '@/components/workout/ActiveWorkoutIndicator';
import { AnimatedBackground } from '@/components/AnimatedBackground';

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
  title: 'Eternal Fitness',
  description: 'Your personal fitness companion',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${displayFont.variable} ${bodyFont.variable}`}>
      <head>
        <meta name="view-transition" content="same-origin" />
      </head>
      <body suppressHydrationWarning className="min-h-screen">
        <Providers>
          <ThemeHandler>
            <div className="flex flex-col min-h-screen relative">
              <AnimatedBackground />
              <Header />
              <ActiveWorkoutIndicator />
              <main className="flex-1 relative z-10">{children}</main>
              <Footer />
            </div>
          </ThemeHandler>
        </Providers>
      </body>
    </html>
  );
}
