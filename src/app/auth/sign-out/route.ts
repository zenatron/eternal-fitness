import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Get current URL from headers and redirect to its login page
  const host = (await headers()).get('host')
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  
  return Response.redirect(`${protocol}://${host}/login`)
}