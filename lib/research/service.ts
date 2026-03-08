/**
 * リサーチサービス層
 * 各種リサーチタイプの共通処理
 */

import { createLLMClient } from "@/lib/llm";
import type { LLMMessage } from "@/lib/llm/types";
import { getPromptFromDB, PROMPT_KEYS } from "@/lib/prompts";

export type ResearchType = "cast" | "location" | "info" | "evidence";

export interface ResearchRequest {
  type: ResearchType;
  query: string;
  options?: {
    includeX?: boolean;
    includeWeb?: boolean;
    maxResults?: number;
  };
}

export interface ResearchResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  } | null;
  sources?: string[];
}

// リサーチタイプ別のプロンプトキー
const RESEARCH_PROMPT_KEYS: Record<ResearchType, string> = {
  cast: PROMPT_KEYS.RESEARCH_CAST,
  location: PROMPT_KEYS.RESEARCH_LOCATION,
  info: PROMPT_KEYS.RESEARCH_INFO,
  evidence: PROMPT_KEYS.RESEARCH_EVIDENCE,
};

// リサーチタイプ別のPJコード
const _RESEARCH_PROJECT_CODES: Record<ResearchType, string> = {
  cast: "PJ-C-people",
  location: "PJ-C-location",
  info: "PJ-C-info",
  evidence: "PJ-C-evidence",
};

/**
 * リサーチを実行
 */
export async function executeResearch(request: ResearchRequest): Promise<ResearchResponse> {
  const { type, query, options = {} } = request;

  // プロンプト取得
  const promptKey = RESEARCH_PROMPT_KEYS[type];
  const systemPrompt = await getPromptFromDB(promptKey);

  if (!systemPrompt) {
    throw new Error(`Research prompt not found for type: ${type}`);
  }

  // クライアント初期化
  const client = createLLMClient("grok-4-1-fast-reasoning");

  // メッセージ構築
  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: createResearchQuery(query, options),
    },
  ];

  // API呼び出し
  const response = await client.chat(messages);

  return {
    content: response.content,
    usage: response.usage ?? null,
  };
}

/**
 * ストリーミングリサーチ
 */
export async function* streamResearch(request: ResearchRequest): AsyncIterable<string> {
  const { type, query, options = {} } = request;

  const promptKey = RESEARCH_PROMPT_KEYS[type];
  const systemPrompt = await getPromptFromDB(promptKey);

  if (!systemPrompt) {
    throw new Error(`Research prompt not found for type: ${type}`);
  }

  const client = createLLMClient("grok-4-1-fast-reasoning");

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: createResearchQuery(query, options),
    },
  ];

  yield* client.stream(messages);
}

/**
 * リサーチクエリ作成
 */
function createResearchQuery(query: string, options: ResearchRequest["options"]): string {
  let fullQuery = query;

  if (options?.includeX) {
    fullQuery += "\n\n※X(Twitter)上の情報も含めて検索してください。";
  }

  if (options?.includeWeb) {
    fullQuery += "\n\n※最新のWeb情報も検索してください。";
  }

  if (options?.maxResults) {
    fullQuery += `\n\n※結果は最大${options.maxResults}件に絞ってください。`;
  }

  return fullQuery;
}
