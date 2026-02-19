/**
 * Gemini LLM Client
 *
 * Google Gemini APIとの統合クライアント
 * @google/generative-aiライブラリを使用
 */

import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import {
  LLMClient,
  LLMMessage,
  LLMResponse,
} from '../types';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger('GeminiClient');

/**
 * Geminiクライアント設定
 */
interface GeminiClientConfig {
  /** APIキー */
  apiKey: string;
  /** モデル名 */
  model: string;
  /** 温度（0-2） */
  temperature?: number;
  /** 最大トークン数 */
  maxTokens?: number;
  /** トップP */
  topP?: number;
}

/**
 * Gemini APIクライアント
 * LLMClientインターフェースを実装
 */
export class GeminiClient implements LLMClient {
  private client: GoogleGenerativeAI;
  private model: string;
  private config: Omit<GeminiClientConfig, 'apiKey' | 'model'>;

  /**
   * プロバイダーとモデル名のマッピング
   */
  private static readonly MODEL_MAPPING: Record<
    'gemini-2.5-flash-lite' | 'gemini-3.0-flash',
    string
  > = {
    'gemini-2.5-flash-lite': 'gemini-2.0-flash-lite-001',
    'gemini-3.0-flash': 'gemini-2.5-flash',
  };

  /**
   * コンストラクタ
   * @param provider - LLMプロバイダー
   * @param config - クライアント設定（オプション）
   */
  constructor(
    private provider: 'gemini-2.5-flash-lite' | 'gemini-3.0-flash',
    config?: Partial<Omit<GeminiClientConfig, 'apiKey'>>
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error('GEMINI_API_KEY environment variable is not set');
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    this.client = new GoogleGenerativeAI(apiKey);
    this.model = GeminiClient.MODEL_MAPPING[provider];
    this.config = {
      temperature: config?.temperature ?? 0.7,
      maxTokens: config?.maxTokens ?? 2048,
      topP: config?.topP ?? 0.95,
    };
    
    logger.info('GeminiClient initialized', { provider, model: this.model });
  }

  /**
   * LLMメッセージをGeminiのContent形式に変換
   * @param messages - LLMメッセージ配列
   * @returns Gemini Content配列
   */
  private convertMessages(messages: LLMMessage[]): { contents: Content[]; systemPrompt?: string } {
    let systemPrompt: string | undefined;
    const contents: Content[] = [];

    for (const message of messages) {
      if (message.role === 'system') {
        // Geminiはシステムプロンプトを別途扱うため、最初のシステムメッセージを保存
        if (!systemPrompt) {
          systemPrompt = message.content;
        }
        continue;
      }

      contents.push({
        role: message.role === 'user' ? 'user' : 'model',
        parts: [{ text: message.content }],
      });
    }

    logger.debug('Messages converted', { 
      inputCount: messages.length, 
      outputCount: contents.length,
      hasSystemPrompt: !!systemPrompt,
    });

    return { contents, systemPrompt };
  }

  /**
   * チャット完了を取得
   * @param messages - メッセージ配列
   * @returns LLMレスポンス
   */
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    logger.info('Starting chat request', { messageCount: messages.length });
    
    try {
      const { contents, systemPrompt } = this.convertMessages(messages);

      if (contents.length === 0) {
        logger.error('No valid messages provided');
        throw new Error('No valid messages provided');
      }

      logger.debug('Creating generative model', { model: this.model });
      
      const model = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens,
          topP: this.config.topP,
        },
      });

      logger.info('Sending request to Gemini API');
      const result = await model.generateContent({ contents });
      const response = result.response;
      const text = response.text();

      // トークン使用量を取得（利用可能な場合）
      const usage = response.usageMetadata;
      const inputTokens = usage?.promptTokenCount ?? 0;
      const outputTokens = usage?.candidatesTokenCount ?? 0;

      // コスト計算（Gemini 2.5 Flash Liteの価格に基づく）
      // 入力: $0.075/1M tokens, 出力: $0.30/1M tokens
      const inputPrice = 0.075 / 1000000;
      const outputPrice = 0.3 / 1000000;
      const cost = inputTokens * inputPrice + outputTokens * outputPrice;

      logger.info('Chat request completed', {
        inputTokens,
        outputTokens,
        cost: cost.toFixed(6),
        contentLength: text.length,
      });

      return {
        content: text,
        usage: {
          inputTokens,
          outputTokens,
          cost,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Gemini API error', { error: errorMessage, errorObject: error });
      throw new Error(`Gemini API error: ${errorMessage}`);
    }
  }

  /**
   * ストリーミングレスポンスを取得
   * @param messages - メッセージ配列
   * @returns 文字列の非同期イテレータ
   */
  async *stream(messages: LLMMessage[]): AsyncIterable<string> {
    logger.info('Starting stream request', { messageCount: messages.length });
    
    try {
      const { contents, systemPrompt } = this.convertMessages(messages);

      if (contents.length === 0) {
        logger.error('No valid messages provided');
        throw new Error('No valid messages provided');
      }

      logger.debug('Creating generative model for streaming', { model: this.model });
      
      const model = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens,
          topP: this.config.topP,
        },
      });

      logger.info('Sending streaming request to Gemini API');
      const result = await model.generateContentStream({ contents });

      let chunkCount = 0;
      let totalLength = 0;

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          chunkCount++;
          totalLength += text.length;
          yield text;
        }
      }

      logger.info('Stream completed', { chunkCount, totalLength });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Gemini API streaming error', { error: errorMessage, errorObject: error });
      throw new Error(`Gemini API streaming error: ${errorMessage}`);
    }
  }
}

/**
 * Geminiクライアントを作成するファクトリ関数
 * @param provider - プロバイダー名
 * @returns GeminiClientインスタンス
 */
export function createGeminiClient(
  provider: 'gemini-2.5-flash-lite' | 'gemini-3.0-flash'
): GeminiClient {
  return new GeminiClient(provider);
}
