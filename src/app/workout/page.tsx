import WorkoutForm from '@/components/WorkoutForm'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function WorkoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto px-4">
      <WorkoutForm user={user} />
    </div>
  )
}
