/**
 * リサーチ機能の定数
 */

// ResearchAgentTypeの定義
type ResearchAgentType = "people" | "evidence";

import { ShieldCheck, Users } from "lucide-react";
import React from "react";
import type { LLMProvider } from "@/lib/llm/types";

/**
 * エージェント別デフォルトプロバイダー
 */
export const AGENT_DEFAULT_PROVIDERS: Record<ResearchAgentType, LLMProvider> = {
  people: "grok-4-1-fast-reasoning",
  // evidence: "perplexity-sonar",
  evidence: "grok-4.20-multi-agent-beta-latest",
};

/**
 * エージェント別サポートプロバイダー
 */
export const AGENT_SUPPORTED_PROVIDERS: Record<ResearchAgentType, LLMProvider[]> = {
  people: ["grok-4-1-fast-reasoning", "grok-4-0709"],
  // evidence: ["perplexity-sonar", "perplexity-sonar-pro"],
  evidence: ["grok-4.20-multi-agent-beta-latest", "grok-4-1-fast-reasoning", "grok-4-0709"],
};

/**
 * エージェント設定
 */
export interface AgentConfig {
  label: string;
  icon: React.ReactNode;
  description: string;
  placeholder: string;
  color: string;
  gradient: string;
}

export const AGENT_CONFIG: Record<ResearchAgentType, AgentConfig> = {
  people: {
    label: "人探し",
    icon: React.createElement(Users, { className: "w-4 h-4" }),
    description:
      "X検索を活用して、特定の人物を効率的に探します。名前、職業、所在地などの手がかりを入力してください。",
    placeholder: "探したい人物について教えてください（名前、職業、所在地など）",
    color: "#3b82f6",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  evidence: {
    label: "エビデンス",
    icon: React.createElement(ShieldCheck, { className: "w-4 h-4" }),
    description: "事実を検証し、信頼できる情報源を提示します。確認したい事実を入力してください。",
    placeholder: "確認したい事実を入力してください",
    color: "#f59e0b",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
};

/**
 * エージェント別システムプロンプト
 */
export function getSystemPrompt(agentType: ResearchAgentType): string {
  switch (agentType) {
    case "people":
      return `あなたは人物リサーチの専門家です。X（旧Twitter）検索を活用して、特定の人物を効率的に探すお手伝いをします。

以下の点に注意して回答してください：
- 人物の特定に役立つ情報（名前、職業、所在地、SNSアカウントなど）を整理
- 信頼できる情報源がある場合は提示
- プライバシーに配慮し、公開情報のみを扱う
- 日本のテレビ制作現場で使用される形式で出力`;

    case "evidence":
      return `あなたは事実確認の専門家です。エビデンスに基づいた検証を行います。

以下の点に注意して回答してください：
- 事実と意見を明確に区別
- 信頼できる情報源（公的機関、権威あるメディア等）を提示
- 不確かな情報は「未確認」として明記
- 複数の視点からの情報を提示
- 日本のテレビ制作現場で使用される形式で出力`;

    default:
      return "あなたは調査リサーチの専門家です。";
  }
}

/**
 * エージェント別提案クエリ
 */
export const AGENT_SUGGESTIONS: Record<ResearchAgentType, string[]> = {
  people: [
    "東京で活動している若手俳優を探しています",
    "SNSで話題になっている料理人を知りたい",
    "特定の業界で著名な専門家を探しています",
  ],
  evidence: [
    "この統計データの出典を確認したいです",
    "最近話題になった健康に関する噂は本当ですか？",
    "歴史的な事実を検証したいのですが",
  ],
};
