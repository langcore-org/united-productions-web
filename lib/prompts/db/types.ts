/**
 * プロンプトDB操作用型定義
 *
 * @created 2026-02-22 12:10
 */

import type { SystemPrompt, SystemPromptVersion } from "@prisma/client";

export interface PromptVersionInfo {
  version: number;
  changedBy: string | null;
  changeNote: string | null;
  createdAt: Date;
}

export interface PromptWithVersions extends SystemPrompt {
  versions: SystemPromptVersion[];
}

export type { SystemPrompt, SystemPromptVersion };
