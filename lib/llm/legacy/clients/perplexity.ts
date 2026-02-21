/**
 * Perplexity LLM Client
 *
 * Perplexity APIとの統合
 * 特徴: エビデンス（ソースURL）付き回答を返す
 *
 * APIドキュメント: https://docs.perplexity.ai/
 */

import { LLMClient, LLMMessage, LLMResponse, LLMProvider } from '../types';
import { getProviderInfo } from '../../config';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger('PerplexityClient');

/**
 * Perplexity APIレスポンスの型
 */
interface PerplexityApiResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
}

/**
 * Perplexity APIリクエストの型
 */
interface PerplexityApiRequest {
  model: string;
  messages: {
    role: string;
    content: string;
  }[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

/**
 * Perplexityモデルマッピング
 */
const MODEL_MAPPING: Record<LLMProvider, string> = {
  'perplexity-sonar': 'sonar',
  'perplexity-sonar-pro': 'sonar-pro',
  // 他のプロバイダーは使用しない
  'gemini-2.5-flash-lite': '',
  'gemini-3.0-flash': '',
  'grok-4-1-fast-reasoning': '',
  'grok-4-0709': '',
  'gpt-4o-mini': '',
  'gpt-5': '',
  'claude-sonnet-4.5': '',
  'claude-opus-4.6': '',
};

/**
 * Perplexity APIクライアント
 */
export class PerplexityClient implements LLMClient {
  private apiKey: string;
  private provider: LLMProvider;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';

  constructor(provider: LLMProvider) {
    this.provider = provider;
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';

    if (!this.apiKey) {
      logger.error('PERPLEXITY_API_KEY is not set');
      throw new Error(
        'PERPLEXITY_API_KEY is not set. Please set it in your environment variables.'
      );
    }
    
    logger.info('PerplexityClient initialized', { provider, model: MODEL_MAPPING[provider] });
  }

  /**
   * チャット完了を取得
   * @param messages - メッセージ配列
   * @returns LLMレスポンス（ソースURL含む）
   */
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    logger.info('Starting chat request', { messageCount: messages.length, model: MODEL_MAPPING[this.provider] });
    
    const requestBody: PerplexityApiRequest = {
      model: MODEL_MAPPING[this.provider],
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
      max_tokens: 4096,
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Perplexity API error', { status: response.status, error: errorText });
      throw new Error(
        `Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: PerplexityApiResponse = await response.json();

    // レスポンス内容を構築
    let content = data.choices[0]?.message?.content || '';

    // ソースURL（citations）があれば追加
    if (data.citations && data.citations.length > 0) {
      content += '\n\n---\n\n**Sources:**\n';
      data.citations.forEach((citation, index) => {
        content += `[${index + 1}] ${citation}\n`;
      });
    }

    // コスト計算
    const providerInfo = getProviderInfo(this.provider);
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    const cost =
      (inputTokens / 1000000) * providerInfo.inputPrice +
      (outputTokens / 1000000) * providerInfo.outputPrice;

    logger.info('Chat request completed', {
      inputTokens,
      outputTokens,
      cost: cost.toFixed(6),
      contentLength: content.length,
      citationCount: data.citations?.length || 0,
    });

    return {
      content,
      usage: {
        inputTokens,
        outputTokens,
        cost: Number(cost.toFixed(6)),
      },
    };
  }

  /**
   * ストリーミングレスポンスを取得
   * @param messages - メッセージ配列
   * @returns 文字列の非同期イテレータ
   */
  async *stream(messages: LLMMessage[]): AsyncIterable<string> {
    logger.info('Starting stream request', { messageCount: messages.length, model: MODEL_MAPPING[this.provider] });
    
    const requestBody: PerplexityApiRequest = {
      model: MODEL_MAPPING[this.provider],
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Perplexity API streaming error', { status: response.status, error: errorText });
      throw new Error(
        `Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    if (!response.body) {
      logger.error('Response body is null');
      throw new Error('Response body is null');
    }

    logger.info('Starting to read stream');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let citations: string[] = [];
    const citationsSent = false;

    let chunkCount = 0;
    let totalLength = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // ストリーム終了時にソースURLを送信
          if (citations.length > 0 && !citationsSent) {
            let sourcesSection = '\n\n---\n\n**Sources:**\n';
            for (let i = 0; i < citations.length; i++) {
              sourcesSection += `[${i + 1}] ${citations[i]}\n`;
            }
            totalLength += sourcesSection.length;
            yield sourcesSection;
          }
          logger.info('Stream completed', { chunkCount, totalLength, citationCount: citations.length });
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed: PerplexityApiResponse = JSON.parse(data);

              // citationsを収集
              if (parsed.citations && parsed.citations.length > 0) {
                citations = parsed.citations;
              }

              // コンテンツチャンクを抽出
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                chunkCount++;
                totalLength += content.length;
                yield content;
              }
            } catch {
              // JSONパースエラーは無視（空行等）
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
