/**
 * Theme Initializer Component
 *
 * Loads user settings and applies theme at layout level.
 * Should be placed in app layouts to ensure theme is applied on page load.
 */

'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import type { DarkMode, ThemePreset } from '@/lib/settings/types';

interface UserSettingsResponse {
  darkmode: DarkMode;
  theme: ThemePreset;
}

export function ThemeInitializer() {
  const { setTheme, resolvedTheme } = useTheme();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function loadAndApplySettings() {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settings: UserSettingsResponse = await response.json();

          // Apply dark mode
          if (settings.darkmode && settings.darkmode !== 'system') {
            setTheme(settings.darkmode);
          } else if (settings.darkmode === 'system') {
            setTheme('system');
          }

          // Apply color theme
          if (settings.theme && settings.theme !== 'default') {
            document.documentElement.setAttribute('data-theme', settings.theme);
          } else {
            document.documentElement.removeAttribute('data-theme');
          }
        }
      } catch (error) {
        console.error('Failed to load user settings:', error);
      } finally {
        setInitialized(true);
      }
    }

    loadAndApplySettings();
  }, [setTheme]);

  // Listen for theme changes and re-apply color theme
  useEffect(() => {
    if (!initialized) return;

    // When dark mode changes, we need to ensure data-theme is preserved
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme) {
      // Re-apply to ensure CSS specificity works correctly
      document.documentElement.setAttribute('data-theme', currentTheme);
    }
  }, [resolvedTheme, initialized]);

  // This component doesn't render anything
  return null;
}
