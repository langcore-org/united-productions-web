/**
 * API使用量追跡ユーティリティ（Supabase版）
 *
 * @updated 2026-03-09 Supabase移行
 */

import { PROVIDER_CONFIG } from "@/lib/llm/config";
import type { LLMProvider } from "@/lib/llm/types";
import { createAdminClient } from "@/lib/supabase/admin";

interface UsageData {
  userId: string;
  provider: LLMProvider;
  inputTokens: number;
  outputTokens: number;
  metadata?: Record<string, unknown>;
}

function toDbProvider(provider: LLMProvider): string {
  const mapping: Record<string, string> = {
    "grok-4.1-fast-reasoning": "GROK_4_1_FAST_REASONING",
    "grok-4-0709": "GROK_4_0709",
  };
  return mapping[provider] || provider.toUpperCase().replace(/-/g, "_");
}

/**
 * API使用量を記録（サービスロールでRLSバイパス）
 */
export async function trackUsage(data: UsageData): Promise<void> {
  try {
    const providerConfig = PROVIDER_CONFIG[data.provider];
    if (!providerConfig) {
      console.warn(`Unknown provider: ${data.provider}`);
      return;
    }

    const inputCost = (data.inputTokens / 1_000_000) * providerConfig.inputPrice;
    const outputCost = (data.outputTokens / 1_000_000) * providerConfig.outputPrice;
    const totalCost = inputCost + outputCost;

    const supabase = createAdminClient();
    const { error } = await supabase.from("usage_logs").insert({
      user_id: data.userId,
      provider: toDbProvider(data.provider),
      input_tokens: data.inputTokens,
      output_tokens: data.outputTokens,
      cost: totalCost,
      metadata: data.metadata || {},
    });

    if (error) throw error;

    console.log(`[Usage] Tracked: ${data.provider}, Cost: $${totalCost.toFixed(6)}`);
  } catch (error) {
    console.error("Failed to track usage:", error);
  }
}

/**
 * レスポンスからトークン数を抽出（各プロバイダー対応）
 */
interface TokenUsageResponse {
  usage?: {
    prompt_tokens?: number;
    inputTokens?: number;
    completion_tokens?: number;
    outputTokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

export function extractTokenUsage(response: unknown): {
  inputTokens: number;
  outputTokens: number;
} {
  const r = response as TokenUsageResponse;

  if (r?.usage) {
    return {
      inputTokens: r.usage.prompt_tokens || r.usage.inputTokens || r.usage.input_tokens || 0,
      outputTokens: r.usage.completion_tokens || r.usage.outputTokens || r.usage.output_tokens || 0,
    };
  }

  if (r?.usageMetadata) {
    return {
      inputTokens: r.usageMetadata.promptTokenCount || 0,
      outputTokens: r.usageMetadata.candidatesTokenCount || 0,
    };
  }

  return { inputTokens: 0, outputTokens: 0 };
}
