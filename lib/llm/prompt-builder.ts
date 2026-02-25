/**
 * LLM用プロンプトビルダー
 *
 * APIルートで使用するプロンプト構築ロジックを共通化
 *
 * @created 2026-02-24
 */

import { createCompositeSystemPrompt, createSystemPrompt } from "@/lib/knowledge/programs";
import { getPromptFromDB } from "@/lib/prompts/db";

/** 機能IDとプロンプトキーのマッピング */
export const FEATURE_TO_PROMPT_KEY: Record<string, string> = {
  "general-chat": "GENERAL_CHAT",
  "research-cast": "RESEARCH_CAST",
  "research-location": "RESEARCH_LOCATION",
  "research-info": "RESEARCH_INFO",
  "research-evidence": "RESEARCH_EVIDENCE",
  minutes: "MINUTES",
  proposal: "PROPOSAL",
  "na-script": "TRANSCRIPT",
};

/**
 * 機能IDからプロンプトキーを取得
 */
export function getPromptKeyForFeature(featureId: string | undefined): string | null {
  if (!featureId) return null;
  return FEATURE_TO_PROMPT_KEY[featureId] || null;
}

/**
 * 機能IDが有効かチェック
 */
export function isValidFeatureId(featureId: string | undefined): boolean {
  if (!featureId) return false;
  return featureId in FEATURE_TO_PROMPT_KEY;
}

/**
 * 有効な機能IDの一覧を取得
 */
export function getValidFeatureIds(): string[] {
  return Object.keys(FEATURE_TO_PROMPT_KEY);
}

/**
 * システムプロンプトを構築
 *
 * - 番組情報を背景知識として含む
 * - 機能に応じた固有の指示を追加（DBから取得）
 *
 * @param programId - 番組ID（"all"または特定の番組ID）
 * @param featureId - 機能ID（例: research-cast, proposal）
 * @returns 構築されたシステムプロンプト
 */
export async function buildSystemPrompt(
  programId: string = "all",
  featureId?: string,
): Promise<string> {
  // 機能に応じたプロンプトをDBから取得
  const promptKey = getPromptKeyForFeature(featureId);
  const featurePrompt = promptKey ? await getPromptFromDB(promptKey) : null;

  // 複合プロンプトを生成（番組情報 + 機能固有の指示）
  return createCompositeSystemPrompt(programId, featurePrompt || undefined);
}

/**
 * システムプロンプトを構築（同期版 - フォールバック用）
 *
 * DBアクセスなしで、番組情報のみのプロンプトを生成
 */
export function buildSystemPromptSync(programId: string = "all"): string {
  return createSystemPrompt(programId);
}
