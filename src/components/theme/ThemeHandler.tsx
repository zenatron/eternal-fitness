'use client';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';

export function ThemeHandler({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // This ensures theme changes are handled client-side only
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  return <>{children}</>;
}
