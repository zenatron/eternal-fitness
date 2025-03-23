import WorkoutForm from '@/components/WorkoutForm'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function WorkoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select()
    .eq('id', user.id)
    .single()
  if (error) {
    console.error('Error fetching profile (likely not setup):', error)
    redirect('/profile/setup')
  }
  if (!profile) {
    redirect('/profile/setup')
  }

  return (
    <div>
      <WorkoutForm />
    </div>
  )
}