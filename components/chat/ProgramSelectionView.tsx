"use client";

import { ArrowRight, MessageSquare } from "lucide-react";
import { ALL_PROGRAMS_OPTION, programOptions } from "@/lib/knowledge/programs";

export interface ProgramSelectionViewProps {
  featureTitle: string;
  featureDescription?: string;
  onSelect: (programId: string) => void;
}

export function ProgramSelectionView({
  featureTitle,
  onSelect,
}: ProgramSelectionViewProps) {
  // 全番組選択肢（全番組 + 各番組）
  const options = [ALL_PROGRAMS_OPTION, ...programOptions];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-900/20 to-gray-600/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-gray-700" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">{featureTitle}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Title Section */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              どの番組についてお調べしますか？
            </h2>
          </div>

          {/* Program Grid - 3列レイアウト */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
                className="group flex items-center justify-between p-4 text-left bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 group-hover:text-gray-700 mb-0.5 truncate">
                    {option.label}
                  </div>
                  {option.station && (
                    <div className="text-xs text-gray-400 truncate">
                      {option.station}
                      {option.genre && ` · ${option.genre}`}
                    </div>
                  )}
                  {option.value === "all" && (
                    <div className="text-xs text-gray-400">
                      番組を指定せずに検討
                    </div>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 ml-2 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
