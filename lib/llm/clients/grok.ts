/**
 * Grok LLM Client
 *
 * xAI APIを使用したLLMクライアント実装
 * 対応モデル: grok-4.1-fast, grok-4
 * X Searchツール使用可能
 */

import { LLMClient, LLMMessage, LLMResponse, LLMProvider } from '../types';
import { getProviderInfo } from '../config';

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
      throw new Error('XAI_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
  }

  /**
   * プロバイダーからモデル名を取得
   */
  private getModelName(provider: LLMProvider): string {
    switch (provider) {
      case 'grok-4.1-fast':
        return 'grok-4.1-fast';
      case 'grok-4':
        return 'grok-4';
      default:
        throw new Error(`Unsupported Grok provider: ${provider}`);
    }
  }

  /**
   * チャット完了を取得
   */
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
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
      throw new Error(`xAI API error: ${response.status} ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

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
              yield content;
            }
          } catch (e) {
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
            } catch (e) {
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
