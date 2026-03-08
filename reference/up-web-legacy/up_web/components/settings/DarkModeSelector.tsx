/**
 * Dark Mode Selector Component
 */

'use client';

import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';
import type { DarkMode } from '@/lib/settings/types';

interface DarkModeSelectorProps {
  selectedMode: DarkMode;
  onChange: (mode: DarkMode) => void;
}

export function DarkModeSelector({ selectedMode, onChange }: DarkModeSelectorProps) {
  const modes = [
    { value: 'light' as DarkMode, label: 'ライト', icon: Sun },
    { value: 'dark' as DarkMode, label: 'ダーク', icon: Moon },
    { value: 'system' as DarkMode, label: 'システム', icon: Monitor },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.value;

          return (
            <Button
              key={mode.value}
              variant={isSelected ? 'default' : 'outline'}
              className="flex flex-col gap-2 h-auto py-4"
              onClick={() => onChange(mode.value)}
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium">{mode.label}</span>
            </Button>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        {selectedMode === 'system'
          ? 'システムの設定に従って自動的に切り替わります'
          : selectedMode === 'light'
            ? 'ライトモードで表示されます'
            : 'ダークモードで表示されます'}
      </p>
    </div>
  );
}
