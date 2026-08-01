'use client';

import { useState } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';

/**
 * Profile picture with a three-step fallback:
 *
 *   custom upload  →  PocketID `picture` claim  →  initials
 *
 * Initials are the final fallback rather than a generic silhouette because a
 * small friends-and-family app benefits from people being distinguishable at a
 * glance, and a letter on a forge-tinted disc does that without a network
 * request.
 */

interface AvatarProps {
  /** Custom uploaded avatar URL, if the user has one. */
  avatarUrl?: string | null;
  /** OIDC picture claim. */
  imageUrl?: string | null;
  name?: string | null;
  email?: string | null;
  /** Rendered pixel size. */
  size?: number;
  className?: string;
}

function initialsFor(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || '';
  if (!source) return '?';

  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function Avatar({
  avatarUrl,
  imageUrl,
  name,
  email,
  size = 64,
  className = '',
}: AvatarProps) {
  // A remote picture URL can 404 or be blocked; falling through to initials is
  // better than a broken-image glyph.
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  const src = [avatarUrl, imageUrl].find((candidate) => candidate && !failed[candidate]);

  const dimension = { width: size, height: size };

  if (src) {
    return (
      // Deliberately a plain <img>: these are user-supplied, already resized to
      // 256px server-side, and next/image would add a proxy hop for no gain.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ? `${name}'s profile picture` : 'Profile picture'}
        style={dimension}
        onError={() => setFailed((prev) => ({ ...prev, [src]: true }))}
        className={`shrink-0 rounded-full border-2 border-white/25 object-cover ${className}`}
      />
    );
  }

  const initials = initialsFor(name, email);

  if (initials === '?') {
    return (
      <UserCircleIcon
        style={dimension}
        className={`shrink-0 text-white/70 ${className}`}
        aria-label="Profile picture"
      />
    );
  }

  return (
    <span
      style={{ ...dimension, fontSize: Math.round(size * 0.38) }}
      aria-label={name ? `${name}'s profile picture` : 'Profile picture'}
      className={`flex shrink-0 select-none items-center justify-center rounded-full border-2 border-white/25 bg-gradient-to-br from-accent-400 to-accent-600 font-display font-bold uppercase leading-none text-white ${className}`}
    >
      {initials}
    </span>
  );
}
