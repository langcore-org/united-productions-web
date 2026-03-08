/**
 * Theme Preview Card Component
 */

'use client';

import { Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ThemePresetConfig } from '@/lib/settings/types';

interface ThemePreviewCardProps {
  preset: ThemePresetConfig;
  isSelected: boolean;
  onSelect: () => void;
}

export function ThemePreviewCard({ preset, isSelected, onSelect }: ThemePreviewCardProps) {
  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all hover:ring-2 hover:ring-primary/50',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onSelect}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 z-10">
          <Check className="h-4 w-4" />
        </div>
      )}

      {/* Theme Preview */}
      <div className="p-4 space-y-3">
        {/* Theme Name */}
        <div className="font-semibold">{preset.name}</div>
        <p className="text-xs text-muted-foreground">{preset.description}</p>

        {/* Color Preview Bars */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Primary & Accent</div>
          <div className="flex gap-2">
            <div className="flex-1 h-12 rounded border" style={{ backgroundColor: preset.colors.light.primary }} />
            <div className="flex-1 h-12 rounded border" style={{ backgroundColor: preset.colors.light.accent }} />
          </div>
        </div>
      </div>
    </Card>
  );
}
