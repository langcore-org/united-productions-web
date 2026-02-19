/**
 * リサーチ機能の定数
 */

// ResearchAgentTypeの定義
type ResearchAgentType = "people" | "location" | "evidence";
import { LLMProvider } from "@/lib/llm/types";
import { Users, MapPin, ShieldCheck } from "lucide-react";
import React from "react";

/**
 * エージェント別デフォルトプロバイダー
 */
export const AGENT_DEFAULT_PROVIDERS: Record<ResearchAgentType, LLMProvider> = {
  people: "grok-4-1-fast-reasoning",
  evidence: "perplexity-sonar",
  location: "perplexity-sonar",
};

/**
 * エージェント別サポートプロバイダー
 */
export const AGENT_SUPPORTED_PROVIDERS: Record<ResearchAgentType, LLMProvider[]> = {
  people: ["grok-4-1-fast-reasoning", "grok-4-0709"],
  evidence: ["perplexity-sonar", "perplexity-sonar-pro"],
  location: ["perplexity-sonar", "perplexity-sonar-pro", "grok-4-1-fast-reasoning", "grok-4-0709"],
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
    description: "X検索を活用して、特定の人物を効率的に探します。名前、職業、所在地などの手がかりを入力してください。",
    placeholder: "探したい人物について教えてください（名前、職業、所在地など）",
    color: "#3b82f6",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  location: {
    label: "ロケ地探し",
    icon: React.createElement(MapPin, { className: "w-4 h-4" }),
    description: "撮影に適したロケ地を提案します。雰囲気、エリア、撮影条件などを入力してください。",
    placeholder: "どんなロケ地をお探しですか？",
    color: "#22c55e",
    gradient: "from-green-500/20 to-emerald-500/20",
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

    case "location":
      return `あなたはロケ地リサーチの専門家です。撮影に適したロケーションを提案します。

以下の点に注意して回答してください：
- 撮影条件（雰囲気、エリア、アクセス、許可など）を考慮
- 具体的な場所名や住所を提示可能な場合は提示
- 撮影許可が必要な場合はその旨を明記
- 代替案も複数提示
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
  location: [
    "渋谷周辺で撮影できるレトロなカフェを探しています",
    "自然豊かな山のロケーションが欲しいです",
    "夜景がきれいな屋上スペースはありますか？",
  ],
  evidence: [
    "この統計データの出典を確認したいです",
    "最近話題になった健康に関する噂は本当ですか？",
    "歴史的な事実を検証したいのですが",
  ],
};
