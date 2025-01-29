import { createClient } from '@/utils/supabase/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return Response.redirect(process.env.NEXT_PUBLIC_SITE_URL + '/login')
}
