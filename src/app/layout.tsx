import { Providers } from '@/components/Providers'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { createClient } from '@/utils/supabase/server'
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Eternal Fitness',
  description: 'Your personalized fitness journey starts here',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body className="bg-gray-100 dark:bg-slate-800">
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header user={user} />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  )
} 