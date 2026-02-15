export type LLMProvider =
  | "gemini-25-flash-lite"
  | "gemini-30-flash"
  | "grok-41-fast"
  | "grok-4"
  | "gpt-4o-mini"
  | "gpt-5"
  | "claude-sonnet-45"
  | "claude-opus-46"
  | "perplexity-sonar"
  | "perplexity-sonar-pro";

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
  timestamp?: Date;
}

export interface LLMRequest {
  provider: LLMProvider;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  thinking?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
}
