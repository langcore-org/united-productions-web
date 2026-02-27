"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { programOptions } from "@/lib/knowledge/programs";
import type { ProgramOption } from "@/lib/knowledge/types";

export interface ProgramSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ProgramSelector({ value, onChange, disabled }: ProgramSelectorProps) {
  const options: ProgramOption[] = programOptions;

  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[280px] h-8 text-sm border-gray-200 bg-white">
        <SelectValue placeholder="番組を選択してください" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-sm">
            <span className="flex items-center gap-2">
              <span className="truncate">{option.label}</span>
              {option.station && (
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  ({option.station})
                </span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
