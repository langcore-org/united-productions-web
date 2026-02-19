/**
 * Grok LLM Client
 *
 * xAI APIを使用したLLMクライアント実装
 * 対応モデル: grok-4.1-fast, grok-4
 * X Searchツール使用可能
 */

import { LLMClient, LLMMessage, LLMResponse, LLMProvider } from '../types';
import { getProviderInfo } from '../config';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger('GrokClient');

/**
 * xAI APIレスポンス型
 */
interface XAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * xAI APIストリーミングレスポンス型
 */
interface XAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

/**
 * Grokクライアント
 */
export class GrokClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private provider: LLMProvider;
  private baseUrl = 'https://api.x.ai/v1';

  constructor(provider: LLMProvider) {
    this.provider = provider;
    this.model = this.getModelName(provider);
    
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      logger.error('XAI_API_KEY environment variable is not set');
      throw new Error('XAI_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
    logger.info('GrokClient initialized', { provider, model: this.model });
  }

  /**
   * プロバイダーからモデル名を取得
   */
  private getModelName(provider: LLMProvider): string {
    switch (provider) {
      case 'grok-beta':
        return 'grok-beta';  // xAI APIで実際に使えるモデル
      case 'grok-2-1212':
        return 'grok-2-1212';  // xAI APIで実際に使えるモデル
      default:
        throw new Error(`Unsupported Grok provider: ${provider}`);
    }
  }

  /**
   * チャット完了を取得
   */
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    logger.info('Starting chat request', { messageCount: messages.length, model: this.model });
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('xAI API error', { status: response.status, error: errorText });
      throw new Error(`xAI API error: ${response.status} ${errorText}`);
    }

    const data: XAIChatResponse = await response.json();
    
    const content = data.choices[0]?.message?.content || '';
    const usage = data.usage;
    
    // コスト計算
    const providerInfo = getProviderInfo(this.provider);
    const inputTokens = usage?.prompt_tokens || 0;
    const outputTokens = usage?.completion_tokens || 0;
    const cost = Number(
      (
        (inputTokens / 1000000) * providerInfo.inputPrice +
        (outputTokens / 1000000) * providerInfo.outputPrice
      ).toFixed(6)
    );

    logger.info('Chat request completed', {
      inputTokens,
      outputTokens,
      cost: cost.toFixed(6),
      contentLength: content.length,
    });

    return {
      content,
      usage: {
        inputTokens,
        outputTokens,
        cost,
      },
    };
  }

  /**
   * ストリーミングレスポンスを取得
   */
  async *stream(messages: LLMMessage[]): AsyncIterable<string> {
    logger.info('Starting stream request', { messageCount: messages.length, model: this.model });
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('xAI API streaming error', { status: response.status, error: errorText });
      throw new Error(`xAI API error: ${response.status} ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      logger.error('Response body is not readable');
      throw new Error('Response body is not readable');
    }

    logger.info('Starting to read stream');

    const decoder = new TextDecoder();
    let buffer = '';

    let chunkCount = 0;
    let totalLength = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          logger.info('Stream completed', { chunkCount, totalLength });
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const data = trimmedLine.slice(6); // Remove 'data: ' prefix
          
          if (data === '[DONE]') {
            return;
          }

          try {
            const chunk: XAIStreamChunk = JSON.parse(data);
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              chunkCount++;
              totalLength += content.length;
              yield content;
            }
          } catch {
            // Ignore JSON parse errors for malformed chunks
            continue;
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const trimmedLine = buffer.trim();
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);
          if (data !== '[DONE]') {
            try {
              const chunk: XAIStreamChunk = JSON.parse(data);
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
