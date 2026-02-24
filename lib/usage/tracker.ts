/**
 * API使用量追跡ユーティリティ
 */

import { PROVIDER_CONFIG } from "@/lib/llm/config";
import type { LLMProvider } from "@/lib/llm/types";
import { prisma } from "@/lib/prisma";

interface UsageData {
  userId: string;
  provider: LLMProvider;
  inputTokens: number;
  outputTokens: number;
  metadata?: Record<string, any>;
}

// アプリのProvider型をPrismaのenum形式に変換
function toPrismaProvider(provider: LLMProvider): string {
  const mapping: Record<string, string> = {
    // "gemini-2.5-flash-lite": "GEMINI_25_FLASH_LITE",
    // "gemini-3.0-flash": "GEMINI_30_FLASH",
    "grok-4.1-fast-reasoning": "GROK_4_1_FAST_REASONING",
    "grok-4-0709": "GROK_4_0709",
    // "gpt-4o-mini": "GPT_4O_MINI",
    // "gpt-5": "GPT_5",
    // "claude-sonnet-4.5": "CLAUDE_SONNET_45",
    // "claude-opus-4.6": "CLAUDE_OPUS_46",
    // "perplexity-sonar": "PERPLEXITY_SONAR",
    // "perplexity-sonar-pro": "PERPLEXITY_SONAR_PRO",
  };
  return mapping[provider] || provider.toUpperCase().replace(/-/g, "_");
}

/**
 * API使用量を記録
 */
export async function trackUsage(data: UsageData): Promise<void> {
  try {
    // プロバイダーの料金設定を取得
    const providerConfig = PROVIDER_CONFIG[data.provider];
    if (!providerConfig) {
      console.warn(`Unknown provider: ${data.provider}`);
      return;
    }

    // コスト計算
    const inputCost = (data.inputTokens / 1_000_000) * providerConfig.inputPrice;
    const outputCost = (data.outputTokens / 1_000_000) * providerConfig.outputPrice;
    const totalCost = inputCost + outputCost;

    // データベースに記録
    await prisma.usageLog.create({
      data: {
        userId: data.userId,
        provider: toPrismaProvider(data.provider) as any,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        cost: totalCost,
        metadata: data.metadata || {},
      },
    });

    console.log(`[Usage] Tracked: ${data.provider}, Cost: $${totalCost.toFixed(6)}`);
  } catch (error) {
    console.error("Failed to track usage:", error);
    // エラーを投げずに静かに失敗（メイン処理を妨げない）
  }
}

/**
 * レスポンスからトークン数を抽出（各プロバイダー対応）
 */
export function extractTokenUsage(response: any): {
  inputTokens: number;
  outputTokens: number;
} {
  // OpenAI / Grok 形式
  if (response?.usage) {
    return {
      inputTokens: response.usage.prompt_tokens || response.usage.inputTokens || 0,
      outputTokens: response.usage.completion_tokens || response.usage.outputTokens || 0,
    };
  }

  // Gemini 形式
  if (response?.usageMetadata) {
    return {
      inputTokens: response.usageMetadata.promptTokenCount || 0,
      outputTokens: response.usageMetadata.candidatesTokenCount || 0,
    };
  }

  // Claude 形式
  if (response?.usage) {
    return {
      inputTokens: response.usage.input_tokens || 0,
      outputTokens: response.usage.output_tokens || 0,
    };
  }

  // デフォルト
  return {
    inputTokens: 0,
    outputTokens: 0,
  };
}
