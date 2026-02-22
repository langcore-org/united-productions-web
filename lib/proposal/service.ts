/**
 * 新企画立案サービス
 */

import { createLLMClient } from "@/lib/llm";
import { getPromptFromDB, PROMPT_KEYS } from "@/lib/prompts";
import type { LLMMessage } from "@/lib/llm/types";

export interface ProposalRequest {
  programInfo: string; // 番組情報
  theme: string; // テーマ
  targetAudience?: string; // 対象視聴者
  duration?: string; // 尺
  budget?: string; // 予算
  numProposals?: number; // 生成案数（デフォルト3）
}

export interface ProposalResponse {
  proposals: {
    title: string;
    concept: string;
    structure: string;
    cast: string[];
    location: string;
    highlight: string;
  }[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  } | null;
}

/**
 * 企画案を生成
 */
export async function generateProposals(
  request: ProposalRequest
): Promise<ProposalResponse> {
  const {
    programInfo,
    theme,
    targetAudience,
    duration,
    budget,
    numProposals = 3,
  } = request;

  // プロンプト取得
  const systemPrompt = await getPromptFromDB(PROMPT_KEYS.PROPOSAL);

  if (!systemPrompt) {
    throw new Error("Proposal prompt not found");
  }

  // クライアント初期化
  const client = createLLMClient("grok-4-1-fast-reasoning");

  // ユーザークエリ作成
  const userQuery = createProposalQuery({
    programInfo,
    theme,
    targetAudience,
    duration,
    budget,
    numProposals,
  });

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userQuery },
  ];

  const response = await client.chat(messages);

  // レスポンスをパース
  const proposals = parseProposalResponse(response.content, numProposals);

  return {
    proposals,
    usage: response.usage ?? null,
  };
}

/**
 * クエリ作成
 */
function createProposalQuery(params: {
  programInfo: string;
  theme: string;
  targetAudience?: string;
  duration?: string;
  budget?: string;
  numProposals: number;
}): string {
  let query = `以下の条件で新企画を${params.numProposals}案提案してください。\n\n`;

  query += `【番組情報】\n${params.programInfo}\n\n`;
  query += `【テーマ】\n${params.theme}\n\n`;

  if (params.targetAudience) {
    query += `【対象視聴者】\n${params.targetAudience}\n\n`;
  }

  if (params.duration) {
    query += `【尺】\n${params.duration}\n\n`;
  }

  if (params.budget) {
    query += `【予算】\n${params.budget}\n\n`;
  }

  return query;
}

/**
 * レスポンスパース
 * AIの出力を構造化データに変換
 */
function parseProposalResponse(
  content: string,
  expectedCount: number
): ProposalResponse["proposals"] {
  const proposals: ProposalResponse["proposals"] = [];

  // 案1、案2、案3などで分割
  for (let i = 1; i <= expectedCount; i++) {
    const nextI = i + 1;
    // パターン: "案1:", "案1：", "【案1】", "1. " などに対応
    const pattern = new RegExp(
      `(?:案${i}|【案${i}】|${i}\\.\\s*)[:：]?\\s*([^]*?)(?=(?:案${nextI}|【案${nextI}】|${nextI}\\.\\s*)[:：]?|$)`,
      "i"
    );
    const match = content.match(pattern);

    if (match) {
      const section = match[1].trim();
      proposals.push({
        title: extractField(section, "タイトル|タイトル案|企画名"),
        concept: extractField(section, "コンセプト|企画概要|概要"),
        structure: extractField(section, "構成|ストーリー|流れ"),
        cast: extractList(section, "出演者|キャスト|出演"),
        location: extractField(section, "ロケ地|場所|ロケーション"),
        highlight: extractField(section, "見どころ|ポイント|注目点"),
      });
    }
  }

  // パース失敗時は全体を1案として返す
  if (proposals.length === 0) {
    proposals.push({
      title: "企画案",
      concept: content,
      structure: "",
      cast: [],
      location: "",
      highlight: "",
    });
  }

  return proposals;
}

function extractField(text: string, fieldNames: string): string {
  const pattern = new RegExp(
    `(?:${fieldNames})[:：]\\s*([^\\n]+)`,
    "i"
  );
  const match = text.match(pattern);
  return match ? match[1].trim() : "";
}

function extractList(text: string, fieldNames: string): string[] {
  const pattern = new RegExp(
    `(?:${fieldNames})[:：]\\s*([^]*?)(?=\\n\\n|\\n[^•\\-\\d]|$)`,
    "i"
  );
  const match = text.match(pattern);

  if (!match) return [];

  return match[1]
    .split(/[\\n,、]/)
    .map((item) =>
      item.replace(/^[•\\-\\d.\\)\\）]\\s*/, "").trim()
    )
    .filter(Boolean);
}
