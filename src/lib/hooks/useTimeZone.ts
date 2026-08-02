'use client';

import { useProfile } from '@/lib/hooks/useProfile';
import { deviceTimeZone, resolveTimeZone } from '@/utils/datetime';

/**
 * The zone to interpret civil days in on the client.
 *
 * Prefers the account's stored zone over the device's so that a civil day reads
 * the same on every device the user owns — a workout scheduled for Tuesday from
 * a phone in New York should still say Tuesday on a laptop opened in Berlin.
 * Falls back to the device while the profile is loading or before a zone has
 * ever been reported, which is the better guess than UTC on a client.
 */
export function useTimeZone(): string {
  const { profile } = useProfile();
  return resolveTimeZone(profile?.timeZone ?? deviceTimeZone());
}
