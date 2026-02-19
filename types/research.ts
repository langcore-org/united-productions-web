import { LLMProvider } from "@/lib/llm/types";

export type ResearchAgentType = "people" | "evidence" | "location";

export interface ResearchMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  llmProvider?: LLMProvider;
  citations?: string[];
  thinking?: string;
}

export interface ResearchStreamState {
  content: string;
  thinking: string;
  isThinking: boolean;
  isComplete: boolean;
  error: string | null;
}

export interface ResearchAgentConfig {
  label: string;
  icon: string;
  description: string;
  placeholder: string;
  color: string;
  gradient: string;
}

export interface ResearchRequest {
  agentType: ResearchAgentType;
  query: string;
  provider?: LLMProvider;
  stream?: boolean;
}

export interface ResearchResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  citations?: string[];
}
