/**
 * Settings Types
 */

export type DarkMode = 'light' | 'dark' | 'system';
export type ThemePreset = 'default' | 'ocean' | 'sunset' | 'forest' | 'lavender' | 'rose' | 'slate' | 'amber';
export type NotificationFrequency = 'realtime' | 'daily' | 'none';

export interface UserSettings {
  id: string;
  user_id: string;
  darkmode: DarkMode;
  theme: ThemePreset;
  email_notifications: boolean;
  push_notifications: boolean;
  notification_frequency: NotificationFrequency;
  created_at: string;
  updated_at: string;
}

export interface ThemePresetConfig {
  id: ThemePreset;
  name: string;
  description: string;
  colors: {
    light: {
      primary: string;
      accent: string;
    };
    dark: {
      primary: string;
      accent: string;
    };
  };
}
