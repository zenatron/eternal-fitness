'use client';

import { useRef, useState } from 'react';
import { invalidateProfileData } from '@/lib/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { CameraIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Avatar } from '@/components/ui/Avatar';

/**
 * Avatar with an inline change/remove control.
 *
 * The file is sent as-is and re-encoded on the server (see
 * /api/profile/avatar) — the client only enforces the 10MB ceiling so an
 * oversized pick fails instantly instead of after a long upload on mobile data.
 */

const MAX_BYTES = 10 * 1024 * 1024;

interface AvatarUploaderProps {
  avatarUrl?: string | null;
  imageUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
}

export function AvatarUploader({
  avatarUrl,
  imageUrl,
  name,
  email,
  size = 88,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const queryClient = useQueryClient();

  // A new avatar shows on the dashboard and the leaderboard as well as the
  // profile, so this goes through the group rather than refreshing one query.
  const refresh = () => invalidateProfileData(queryClient);

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error('That image is over 10MB. Pick a smaller one.');
      return;
    }

    setIsBusy(true);
    const body = new FormData();
    body.append('avatar', file);

    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body,
        credentials: 'same-origin',
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(result?.error?.message ?? 'Could not upload that image');
        return;
      }
      await refresh();
      toast.success('Profile picture updated');
    } catch {
      toast.error("Couldn't reach the server. Try again.");
    } finally {
      setIsBusy(false);
      // Clear the input so re-picking the same file still fires onChange.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setIsBusy(true);
    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!response.ok) {
        toast.error('Could not remove the picture');
        return;
      }
      await refresh();
      toast.success('Picture removed');
    } catch {
      toast.error("Couldn't reach the server. Try again.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <Avatar
        avatarUrl={avatarUrl}
        imageUrl={imageUrl}
        name={name}
        email={email}
        size={size}
        className={isBusy ? 'opacity-50' : ''}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isBusy}
        aria-label="Change profile picture"
        className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-accent-500 text-white shadow-md transition-colors hover:bg-accent-600 disabled:opacity-60 tap-control dark:border-surface-100"
      >
        {isBusy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <CameraIcon className="h-4 w-4" />
        )}
      </button>

      {avatarUrl && !isBusy && (
        <button
          type="button"
          onClick={handleRemove}
          aria-label="Remove custom profile picture"
          title="Remove custom picture"
          className="absolute -bottom-1 -left-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-surface-300 text-white shadow-md transition-colors hover:bg-danger-600 tap-control dark:border-surface-100"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
