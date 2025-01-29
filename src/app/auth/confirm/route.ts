import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    
    console.log('Confirming email with:', { token_hash, type })

    if (!token_hash || !type) {
      console.error('Missing parameters:', { token_hash, type })
      return Response.redirect(new URL('/error', request.url))
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    console.log('Verification result:', { data, error })

    if (error) {
      console.error('Verification error:', error)
      return Response.redirect(new URL('/error', request.url))
    }

    // Successfully verified, redirect to workout page
    return Response.redirect(new URL('/workout', request.url))

  } catch (err) {
    console.error('Unexpected error:', err)
    return Response.redirect(new URL('/error', request.url))
  }
}