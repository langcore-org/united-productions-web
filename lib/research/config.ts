import type { LLMProvider } from "@/lib/llm/types";
import type { ResearchAgentConfig, ResearchAgentType } from "@/types/research";

export const AGENT_DEFAULT_PROVIDERS: Record<ResearchAgentType, LLMProvider> = {
  people: "grok-4-1-fast-reasoning",
  // evidence: "perplexity-sonar",
  // location: "perplexity-sonar",
  evidence: "grok-4.20-multi-agent-beta-latest",
  location: "grok-4-1-fast-reasoning",
};

export const AGENT_SUPPORTED_PROVIDERS: Record<ResearchAgentType, LLMProvider[]> = {
  people: ["grok-4-1-fast-reasoning", "grok-4-0709"],
  // evidence: ["perplexity-sonar", "perplexity-sonar-pro"],
  // location: ["perplexity-sonar", "perplexity-sonar-pro", "grok-4-1-fast-reasoning", "grok-4-0709"],
  evidence: ["grok-4.20-multi-agent-beta-latest", "grok-4-1-fast-reasoning", "grok-4-0709"],
  location: ["grok-4-1-fast-reasoning", "grok-4-0709"],
};

export const AGENT_CONFIG: Record<
  ResearchAgentType,
  Omit<ResearchAgentConfig, "icon"> & { iconName: string }
> = {
  people: {
    label: "人探し",
    iconName: "Users",
    description:
      "X検索を活用して、特定の人物を効率的に探します。名前、職業、所在地などの手がかりを入力してください。",
    placeholder: "探したい人物について教えてください（名前、職業、所在地など）",
    color: "#3b82f6",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  location: {
    label: "ロケ地探し",
    iconName: "MapPin",
    description:
      "撮影に適したロケーションを提案します。雰囲気、エリア、撮影条件などを入力してください。",
    placeholder: "どんなロケ地をお探しですか？",
    color: "#22c55e",
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  evidence: {
    label: "エビデンス",
    iconName: "ShieldCheck",
    description: "事実を検証し、信頼できる情報源を提示します。確認したい事実を入力してください。",
    placeholder: "確認したい事実を入力してください",
    color: "#f59e0b",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
};
