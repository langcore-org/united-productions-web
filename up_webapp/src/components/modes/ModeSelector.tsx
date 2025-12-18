'use client';

import { AGENT_MODES, AgentMode } from '@/lib/modes';

interface ModeSelectorProps {
  selectedMode: string;
  onModeSelect: (mode: AgentMode) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ModeSelector({
  selectedMode,
  onModeSelect,
  onCancel,
  onConfirm,
}: ModeSelectorProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold">Select Chat Mode</h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose an agent mode to customize the assistant&apos;s behavior
          </p>
        </div>

        <div className="p-4 overflow-y-auto max-h-[50vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AGENT_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => onModeSelect(mode)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedMode === mode.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{mode.icon}</span>
                  <div>
                    <div className="font-medium">{mode.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {mode.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Start Chat
          </button>
        </div>
      </div>
    </div>
  );
}
