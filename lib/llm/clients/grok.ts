/**
 * Grok LLM Client
 *
 * xAI APIを使用したLLMクライアント実装
 * 対応モデル: grok-4-1-fast-reasoning, grok-4-0709
 * X Searchツール使用可能
 */

import { LLMClient, LLMMessage, LLMResponse, LLMProvider } from '../types';
import { getProviderInfo } from '../config';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger('GrokClient');

/**
 * Grokツール定義
 */
export const GROK_TOOLS = {
  web_search: {
    type: 'web_search' as const,
    description: 'Search the web for current information',
  },
  x_search: {
    type: 'x_search' as const,
    description: 'Search X (Twitter) for real-time information',
  },
  code_execution: {
    type: 'code_execution' as const,
    description: 'Execute Python code in a secure sandbox',
  },
  collections_search: {
    type: 'collections_search' as const,
    description: 'Search uploaded documents and files',
  },
} as const;

/**
 * ツール有効化オプション
 */
export interface GrokToolOptions {
  enableWebSearch?: boolean;
  enableXSearch?: boolean;
  enableCodeExecution?: boolean;
  enableFileSearch?: boolean;
}

/**
 * xAI APIレスポンス型（ツール対応）
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
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * ストリーミング結果（コンテンツ + usage）
 */
export interface StreamResult {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

/**
 * Grokクライアント
 */
export class GrokClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private provider: LLMProvider;
  private baseUrl = 'https://api.x.ai/v1';
  private toolOptions: GrokToolOptions;

  constructor(provider: LLMProvider, toolOptions?: GrokToolOptions) {
    this.provider = provider;
    this.model = this.getModelName(provider);
    // 2026-02-20: デフォルトで全ツール有効（DB設定不要）
    this.toolOptions = {
      enableWebSearch: true,
      enableXSearch: true,
      enableCodeExecution: true,
      enableFileSearch: true,
      ...toolOptions,
    };
    
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      logger.error('XAI_API_KEY environment variable is not set');
      throw new Error('XAI_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
    logger.info('GrokClient initialized', { 
      provider, 
      model: this.model,
      tools: this.toolOptions 
    });
  }

  /**
   * ツールオプションを更新
   */
  setToolOptions(options: GrokToolOptions): void {
    this.toolOptions = { ...this.toolOptions, ...options };
    logger.info('GrokClient tool options updated', { tools: this.toolOptions });
  }

  /**
   * プロバイダーからモデル名を取得
   */
  private getModelName(provider: LLMProvider): string {
    switch (provider) {
      case 'grok-4-1-fast-reasoning':
        return 'grok-4-1-fast-reasoning';
      case 'grok-4-0709':
        return 'grok-4-0709';
      default:
        throw new Error(`Unsupported Grok provider: ${provider}`);
    }
  }

  /**
   * ツール設定を取得
   */
  private getTools(): unknown[] | undefined {
    const tools: unknown[] = [];
    
    if (this.toolOptions.enableWebSearch) {
      tools.push({ type: 'web_search' });
    }
    
    if (this.toolOptions.enableXSearch) {
      tools.push({ type: 'x_search' });
    }
    
    if (this.toolOptions.enableCodeExecution) {
      tools.push({ type: 'code_execution' });
    }
    
    if (this.toolOptions.enableFileSearch) {
      tools.push({ type: 'collections_search' });
    }
    
    return tools.length > 0 ? tools : undefined;
  }

  /**
   * チャット完了を取得
   */
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    logger.info('Starting chat request', { 
      messageCount: messages.length, 
      model: this.model,
      enableWebSearch: this.toolOptions.enableWebSearch 
    });
    
    const requestBody: {
      model: string;
      messages: { role: string; content: string }[];
      tools?: unknown[];
    } = {
      model: this.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    };

    // ツールが有効な場合は追加
    const tools = this.getTools();
    if (tools) {
      requestBody.tools = tools;
    }
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
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
      webSearchEnabled: this.toolOptions.enableWebSearch,
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
   * ストリーミングレスポンスを取得（usage付き）
   * 返り値: { content: string, usage?: { inputTokens, outputTokens, cost } }
   */
  async *streamWithUsage(messages: LLMMessage[]): AsyncIterable<{ chunk?: string; usage?: { inputTokens: number; outputTokens: number; cost: number } }> {
    logger.info('Starting stream request with usage tracking', { 
      messageCount: messages.length, 
      model: this.model,
      enableWebSearch: this.toolOptions.enableWebSearch 
    });
    
    const requestBody: {
      model: string;
      messages: { role: string; content: string }[];
      stream: boolean;
      tools?: unknown[];
    } = {
      model: this.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: true,
    };

    // ツールが有効な場合は追加
    const tools = this.getTools();
    if (tools) {
      requestBody.tools = tools;
    }
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
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
    let finalUsage: { inputTokens: number; outputTokens: number; cost: number } | undefined;

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
            // 最後にusageを返す
            if (finalUsage) {
              yield { usage: finalUsage };
            }
            return;
          }

          try {
            const chunk: XAIStreamChunk = JSON.parse(data);
            const content = chunk.choices[0]?.delta?.content;
            
            // コンテンツをyield
            if (content) {
              chunkCount++;
              totalLength += content.length;
              yield { chunk: content };
            }
            
            // usage情報を記録（最後のチャンクに含まれる場合）
            if (chunk.usage) {
              const providerInfo = getProviderInfo(this.provider);
              const inputTokens = chunk.usage.prompt_tokens;
              const outputTokens = chunk.usage.completion_tokens;
              const cost = Number(
                (
                  (inputTokens / 1000000) * providerInfo.inputPrice +
                  (outputTokens / 1000000) * providerInfo.outputPrice
                ).toFixed(6)
              );
              
              finalUsage = { inputTokens, outputTokens, cost };
              
              logger.info('Stream usage received', {
                inputTokens,
                outputTokens,
                cost: cost.toFixed(6),
              });
            }
          } catch {
            // Ignore JSON parse errors for malformed chunks
            continue;
          }
        }
      }

      // 残りのバッファを処理
      if (buffer.trim()) {
        const trimmedLine = buffer.trim();
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);
          if (data !== '[DONE]') {
            try {
              const chunk: XAIStreamChunk = JSON.parse(data);
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                yield { chunk: content };
              }
              // 最後のチャンクのusageをチェック
              if (chunk.usage) {
                const providerInfo = getProviderInfo(this.provider);
                const inputTokens = chunk.usage.prompt_tokens;
                const outputTokens = chunk.usage.completion_tokens;
                const cost = Number(
                  (
                    (inputTokens / 1000000) * providerInfo.inputPrice +
                    (outputTokens / 1000000) * providerInfo.outputPrice
                  ).toFixed(6)
                );
                finalUsage = { inputTokens, outputTokens, cost };
              }
            } catch {
              // Ignore
            }
          }
        }
      }
      
      // 最後にusageを返す
      if (finalUsage) {
        yield { usage: finalUsage };
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * ストリーミングレスポンスを取得（後方互換性）
   */
  async *stream(messages: LLMMessage[]): AsyncIterable<string> {
    for await (const { chunk } of this.streamWithUsage(messages)) {
      if (chunk) {
        yield chunk;
      }
    }
  }
}

/**
 * ストリーミング結果から最終的なusageを取得
 * この関数はストリーム全体を消費してusageを返す
 */
export async function streamWithUsageTracking(
  client: GrokClient,
  messages: LLMMessage[]
): Promise<{ content: string; usage?: { inputTokens: number; outputTokens: number; cost: number } }> {
  let content = '';
  let finalUsage: { inputTokens: number; outputTokens: number; cost: number } | undefined;
  
  for await (const { chunk, usage } of client.streamWithUsage(messages)) {
    if (chunk) {
      content += chunk;
    }
    if (usage) {
      finalUsage = usage;
    }
  }
  
  return { content, usage: finalUsage };
}
