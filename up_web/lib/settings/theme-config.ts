/**
 * Theme Configuration
 */

import type { ThemePresetConfig } from './types';

/**
 * テーマプリセット一覧
 */
export const THEME_PRESETS: ThemePresetConfig[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'デフォルトのグレースケールテーマ',
    colors: {
      light: {
        primary: 'hsl(0, 0%, 9%)',
        accent: 'hsl(0, 0%, 96.1%)',
      },
      dark: {
        primary: 'hsl(0, 0%, 98%)',
        accent: 'hsl(0, 0%, 14.9%)',
      },
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: '海をイメージした青・シアン系',
    colors: {
      light: {
        primary: 'hsl(220, 90%, 56%)',
        accent: 'hsl(180, 70%, 50%)',
      },
      dark: {
        primary: 'hsl(220, 90%, 60%)',
        accent: 'hsl(180, 70%, 55%)',
      },
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: '夕焼けをイメージしたオレンジ・ピンク系',
    colors: {
      light: {
        primary: 'hsl(30, 95%, 58%)',
        accent: 'hsl(340, 80%, 60%)',
      },
      dark: {
        primary: 'hsl(30, 95%, 62%)',
        accent: 'hsl(340, 75%, 65%)',
      },
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: '森をイメージした緑系',
    colors: {
      light: {
        primary: 'hsl(140, 70%, 45%)',
        accent: 'hsl(160, 60%, 50%)',
      },
      dark: {
        primary: 'hsl(140, 65%, 50%)',
        accent: 'hsl(160, 55%, 55%)',
      },
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'ラベンダーをイメージした紫・バイオレット系',
    colors: {
      light: {
        primary: 'hsl(270, 70%, 60%)',
        accent: 'hsl(290, 65%, 65%)',
      },
      dark: {
        primary: 'hsl(270, 65%, 65%)',
        accent: 'hsl(290, 60%, 70%)',
      },
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'バラをイメージしたローズ・ピンク系',
    colors: {
      light: {
        primary: 'hsl(350, 85%, 62%)',
        accent: 'hsl(340, 75%, 65%)',
      },
      dark: {
        primary: 'hsl(350, 80%, 65%)',
        accent: 'hsl(340, 70%, 68%)',
      },
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'スレートをイメージした青灰色系',
    colors: {
      light: {
        primary: 'hsl(215, 50%, 45%)',
        accent: 'hsl(215, 60%, 55%)',
      },
      dark: {
        primary: 'hsl(215, 45%, 55%)',
        accent: 'hsl(215, 55%, 60%)',
      },
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    description: '琥珀をイメージした金・黄色系',
    colors: {
      light: {
        primary: 'hsl(45, 95%, 50%)',
        accent: 'hsl(40, 90%, 55%)',
      },
      dark: {
        primary: 'hsl(45, 90%, 58%)',
        accent: 'hsl(40, 85%, 62%)',
      },
    },
  },
];

/**
 * テーマプリセットをIDで取得
 */
export function getThemePresetById(id: string): ThemePresetConfig | undefined {
  return THEME_PRESETS.find((preset) => preset.id === id);
}

/**
 * デフォルトのテーマプリセットを取得
 */
export function getDefaultThemePreset(): ThemePresetConfig {
  return THEME_PRESETS[0];
}
