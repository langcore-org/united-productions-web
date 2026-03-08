/**
 * Custom hook for managing user theme settings
 */

'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import type { DarkMode, ThemePreset } from '@/lib/settings/types';

interface UseUserThemeProps {
  initialDarkMode: DarkMode;
  initialThemePreset: ThemePreset;
}

export function useUserTheme({ initialDarkMode, initialThemePreset }: UseUserThemeProps) {
  const { setTheme, theme } = useTheme();

  // Initialize theme on mount
  useEffect(() => {
    // Set dark mode
    if (initialDarkMode !== theme) {
      setTheme(initialDarkMode);
    }

    // Set color theme
    if (initialThemePreset === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', initialThemePreset);
    }
  }, []); // Run only once on mount

  const applyDarkMode = (mode: DarkMode) => {
    setTheme(mode);
  };

  const applyThemePreset = (preset: ThemePreset) => {
    if (preset === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', preset);
    }
  };

  return {
    applyDarkMode,
    applyThemePreset,
  };
}
