/**
 * Theme Preset Selector Component
 */

'use client';

import { ThemePreviewCard } from './ThemePreviewCard';
import { THEME_PRESETS } from '@/lib/settings/theme-config';
import type { ThemePreset } from '@/lib/settings/types';

interface ThemePresetSelectorProps {
  selectedPreset: ThemePreset;
  onPresetChange: (preset: ThemePreset) => void;
}

export function ThemePresetSelector({ selectedPreset, onPresetChange }: ThemePresetSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {THEME_PRESETS.map((preset) => (
          <ThemePreviewCard
            key={preset.id}
            preset={preset}
            isSelected={selectedPreset === preset.id}
            onSelect={() => onPresetChange(preset.id)}
          />
        ))}
      </div>
    </div>
  );
}
