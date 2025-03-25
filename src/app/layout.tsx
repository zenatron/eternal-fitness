import './globals.css'
import type { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import { ThemeHandler } from '@/components/ThemeHandler'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'

export const metadata: Metadata = {
  title: 'Eternal Fitness',
  description: 'Your personal fitness companion',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning>
          <Providers>
          <ThemeHandler>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1 pt-16 app-bg">
                {children}
              </main>
              <Footer />
              </div>
            </ThemeHandler>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  )
} 