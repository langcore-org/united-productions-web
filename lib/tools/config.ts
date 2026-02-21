/**
 * ツール設定の一元管理
 *
 * ツール名とアイコン・ラベル・カラーのマッピングを一箇所で管理する。
 * 新しいツールを追加する場合はここだけ修正すればよい。
 */

import { Search, Twitter, Terminal, FileSearch, BrainCircuit } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ToolConfig {
  icon: LucideIcon;
  label: string;
  color: string;
}

export const TOOL_CONFIG: Record<string, ToolConfig> = {
  web_search:        { icon: Search,       label: 'Web検索',          color: 'text-blue-500'   },
  x_search:          { icon: Twitter,      label: 'X検索',            color: 'text-sky-500'    },
  x_keyword_search:  { icon: Twitter,      label: 'Xキーワード検索',  color: 'text-sky-500'    },
  x_semantic_search: { icon: Twitter,      label: 'X意味検索',        color: 'text-sky-500'    },
  code_execution:    { icon: Terminal,     label: 'コード実行',       color: 'text-green-500'  },
  code_interpreter:  { icon: Terminal,     label: 'コード実行',       color: 'text-green-500'  },
  collections_search:{ icon: FileSearch,   label: 'ファイル検索',     color: 'text-purple-500' },
  file_search:       { icon: FileSearch,   label: 'ファイル検索',     color: 'text-purple-500' },
  custom_tool:       { icon: BrainCircuit, label: 'ツール実行',       color: 'text-orange-500' },
};

/**
 * ツール名からアイコン・ラベル・カラーを取得する。
 * type → name の優先順位で検索し、見つからなければデフォルト値を返す。
 */
export function getToolConfig(
  type: string,
  name?: string,
): ToolConfig {
  return (
    TOOL_CONFIG[type] ??
    TOOL_CONFIG[name ?? ''] ?? {
      icon: BrainCircuit,
      label: name ?? type,
      color: 'text-gray-500',
    }
  );
}
