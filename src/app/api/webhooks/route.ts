import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { deleteUserById } from '../profile/route'

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.SIGNING_SECRET

  if (!SIGNING_SECRET) {
    throw new Error('Error: Please add SIGNING_SECRET from Clerk Dashboard to .env or .env')
  }

  // Create new Svix instance with secret
  const wh = new Webhook(SIGNING_SECRET)

  // Get headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing Svix headers', {
      status: 400,
    })
  }

  // Get body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  let evt: WebhookEvent

  // Verify payload with headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error: Could not verify webhook:', err)
    return new Response('Error: Verification error', {
      status: 400,
    })
  }

  // Do something with payload
  // For this guide, log payload to console
  const { id } = evt.data
  const eventType = evt.type
  console.log(`Received webhook with ID ${id} and event type of ${eventType}`)
  console.log('Webhook payload:', body)

  // TODO: remove this after testing
  if (eventType === 'user.updated') {
    const { email_addresses, first_name, last_name } = evt.data
    console.log(`User updated: ${email_addresses}, ${first_name}, ${last_name}`)
  }

  if (eventType === 'user.deleted') {
    // Extract the userId from the event data
    const userId = id as string;
    console.log(`User deleted in Clerk: ${userId}, initiating database cleanup...`)
    
    if (!userId) {
      console.error("Error: No user ID found in the webhook payload");
      return new Response('Error: No user ID found', { status: 400 });
    }
    
    try {
      // Call the deleteUserById function directly
      const result = await deleteUserById(userId)
      console.log(`Successfully deleted user data:`, result)
    } catch (error) {
      console.error(`Error deleting user data:`, error)
    }
  }

  return new Response('Webhook received', { status: 200 })
}