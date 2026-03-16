/**
 * プロンプトDB操作用型定義
 *
 * @created 2026-02-22 12:10
 * @updated 2026-03-09 Supabase移行
 */

export interface SystemPrompt {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  is_active: boolean;
  current_version: number;
  changed_by: string | null;
  change_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemPromptVersion {
  id: string;
  prompt_id: string;
  version: number;
  content: string;
  changed_by: string | null;
  change_note: string | null;
  created_at: string;
}

export interface PromptVersionInfo {
  version: number;
  changed_by: string | null;
  change_note: string | null;
  created_at: string;
}

export interface PromptWithVersions extends SystemPrompt {
  versions: SystemPromptVersion[];
}
