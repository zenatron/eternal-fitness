import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST() {
  const supabase = await createClient()
  const headersList = headers()
  
  await supabase.auth.signOut()
  
  // Get the current host from the request headers
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  
  return NextResponse.redirect(`${protocol}://${host}/login`)
}