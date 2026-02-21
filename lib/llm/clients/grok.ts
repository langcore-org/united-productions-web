/**
 * Grok LLM Client
 *
 * xAI APIを使用したLLMクライアント実装
 * 対応モデル: grok-4-1-fast-reasoning, grok-4-0709
 * X Searchツール使用可能（Responses API経由）
 */

import { LLMClient, LLMMessage, LLMResponse, LLMProvider } from '../types';
import { getProviderInfo } from '../config';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger('GrokClient');

/**
 * 推論ステップのサブステップをパース
 * 「分析:」「計画:」「実行:」等のパターンで分割
 */
function parseReasoningSteps(summary: string, totalTokens?: number): Array<{ step: number; content: string; tokens?: number }> {
  const patterns = [
    /^分析[:：]\s*/m,
    /^計画[:：]\s*/m,
    /^実行[:：]\s*/m,
    /^統合[:：]\s*/m,
    /^出力[:：]\s*/m,
    /^検索[:：]\s*/m,
    /^調査[:：]\s*/m,
    /^確認[:：]\s*/m,
    /^まとめ[:：]\s*/m,
    /^結論[:：]\s*/m,
  ];

  const lines = summary.split('\n');
  const steps: Array<{ step: number; content: string; tokens?: number }> = [];
  let currentStep: { title: string; content: string } | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const matchedPattern = patterns.find((p) => p.test(trimmedLine));

    if (matchedPattern) {
      // 前のステップを保存
      if (currentStep) {
        steps.push({
          step: steps.length + 1,
          content: `${currentStep.title}: ${currentStep.content}`,
        });
      }
      // 新しいステップを開始
      const title = trimmedLine.split(/[:：]/)[0];
      const content = trimmedLine.replace(matchedPattern, '').trim();
      currentStep = { title, content };
    } else if (currentStep) {
      // 現在のステップに追加
      currentStep.content += '\n' + trimmedLine;
    } else {
      // タイトルなしの最初のステップ
      currentStep = { title: '思考', content: trimmedLine };
    }
  }

  // 最後のステップを保存
  if (currentStep) {
    steps.push({
      step: steps.length + 1,
      content: `${currentStep.title}: ${currentStep.content}`,
      tokens: totalTokens,
    });
  }

  return steps.length > 0 ? steps : [{ step: 1, content: summary, tokens: totalTokens }];
}

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
 * xAI Responses APIレスポンス型
 */
interface XAIResponse {
  id: string;
  object: string;
  created: number;
  completed_at: number;
  model: string;
  output: Array<
    | {
        // メッセージ出力
        id: string;
        type: 'message';
        role: string;
        content: Array<{
          type: 'output_text';
          text: string;
          annotations?: Array<{
            type: 'url_citation';
            url: string;
            title?: string;
          }>;
        }>;
        status: string;
      }
    | {
        // ツール呼び出し
        id: string;
        type: 'web_search_call' | 'custom_tool_call';
        status: string;
        call_id?: string;
        name?: string;
        input?: string;
      }
  >;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    input_tokens_details?: {
      cached_tokens: number;
    };
    output_tokens_details?: {
      reasoning_tokens: number;
    };
    cost_in_usd_ticks?: number;
    num_sources_used?: number;
    num_server_side_tools_used?: number;
    server_side_tool_usage_details?: {
      web_search_calls: number;
      x_search_calls: number;
      code_interpreter_calls: number;
      file_search_calls: number;
      mcp_calls: number;
      document_search_calls: number;
    };
  };
  tools?: Array<{
    type: string;
  }>;
}

/**
 * xAI Responses APIストリーミングイベント型
 */
interface XAIStreamEvent {
  type: string;
  sequence_number?: number;
  delta?: string;
  content_index?: number;
  item_id?: string;
  output_index?: number;
  response?: XAIResponse & {
    reasoning?: { effort?: string; summary?: string };
  };
  usage?: XAIResponse['usage'];
  item?: {
    id: string;
    type: string;
    status: string;
    name?: string;
    input?: string;
    call_id?: string;
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

/** streamWithUsage が yield する値の型 */
type StreamYield = {
  chunk?: string;
  usage?: { inputTokens: number; outputTokens: number; cost: number };
  toolCall?: { id: string; type: string; name?: string; input?: string; status: 'pending' | 'running' | 'completed' | 'failed' };
  toolUsage?: { web_search_calls?: number; x_search_calls?: number; code_interpreter_calls?: number; file_search_calls?: number; mcp_calls?: number; document_search_calls?: number };
  reasoning?: { step: number; content: string; tokens?: number };
  thinking?: string;
};

/** processEvent の戻り値型（内部処理用） */
type ProcessEventResult =
  | StreamYield
  | { reasoningSteps: Array<{ step: number; content: string; tokens?: number }> };

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
    // 2026-02-20: Responses APIを使用してツールを再有効化
    this.toolOptions = {
      enableWebSearch: true,
      enableXSearch: true,
      enableCodeExecution: true,
      enableFileSearch: false,  // vector_store_ids が必要なため無効化
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
      tools: this.toolOptions,
    });
  }

  /**
   * ツールオプションを更新
   */
  setToolOptions(options: GrokToolOptions): void {
    this.toolOptions = { ...this.toolOptions, ...options };
    logger.info('GrokClient tool options updated', { tools: this.toolOptions });
  }

  // ─── プライベートヘルパー ───────────────────────────────────

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

  private getTools(): Array<{ type: string }> | undefined {
    const tools: Array<{ type: string }> = [];
    if (this.toolOptions.enableWebSearch)    tools.push({ type: 'web_search' });
    if (this.toolOptions.enableXSearch)      tools.push({ type: 'x_search' });
    if (this.toolOptions.enableCodeExecution) tools.push({ type: 'code_execution' });
    // collections_search/file_search は vector_store_ids が必要なため現状未対応
    return tools.length > 0 ? tools : undefined;
  }

  private convertMessages(messages: LLMMessage[]): Array<{ role: string; content: string }> {
    return messages.map(msg => ({ role: msg.role, content: msg.content }));
  }

  /** コスト計算（3箇所で使っていたロジックを集約） */
  private calcCost(usage: XAIResponse['usage']): number {
    if (usage.cost_in_usd_ticks) {
      return Number((usage.cost_in_usd_ticks / 1_000_000_000).toFixed(6));
    }
    const info = getProviderInfo(this.provider);
    return Number((
      (usage.input_tokens  / 1_000_000) * info.inputPrice +
      (usage.output_tokens / 1_000_000) * info.outputPrice
    ).toFixed(6));
  }

  /** リクエストボディを組み立てる（chat/streamで共通） */
  private buildRequestBody(messages: LLMMessage[], stream = false) {
    const body: {
      model: string;
      input: Array<{ role: string; content: string }>;
      stream?: boolean;
      tools?: Array<{ type: string }>;
    } = {
      model: this.model,
      input: this.convertMessages(messages),
    };
    if (stream) body.stream = true;
    const tools = this.getTools();
    if (tools) body.tools = tools;
    return body;
  }

  /** xAI Responses APIを呼び出す */
  private async fetchApi(body: object): Promise<Response> {
    return fetch(`${this.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
  }

  /**
   * ストリームイベントのitem（added / done）をtoolCallに変換する
   * 対象外のアイテムタイプの場合はnullを返す
   */
  private parseToolCallItem(
    item: NonNullable<XAIStreamEvent['item']>,
    status: 'running' | 'completed',
  ): StreamYield['toolCall'] | null {
    if (item.type === 'web_search_call') {
      return { id: item.id, type: 'web_search', status };
    }
    if (item.type === 'custom_tool_call') {
      return { id: item.id, type: item.name ?? 'custom_tool', name: item.name, input: item.input, status };
    }
    if (item.type === 'code_interpreter_call') {
      return { id: item.id, type: 'code_interpreter', status };
    }
    return null;
  }

  // ─── パブリックAPI ────────────────────────────────────────

  /**
   * チャット完了を取得（Responses API使用）
   */
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    logger.info('Starting chat request', {
      messageCount: messages.length,
      model: this.model,
      enableWebSearch: this.toolOptions.enableWebSearch,
    });

    const response = await this.fetchApi(this.buildRequestBody(messages));

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('xAI API error', { status: response.status, error: errorText });
      throw new Error(`xAI API error: ${response.status} ${errorText}`);
    }

    const data: XAIResponse = await response.json();

    const messageOutput = data.output.find(item => item.type === 'message');
    const content = messageOutput && 'content' in messageOutput
      ? messageOutput.content.map(c => c.text).join('')
      : '';

    const inputTokens  = data.usage?.input_tokens  ?? 0;
    const outputTokens = data.usage?.output_tokens ?? 0;
    const cost = this.calcCost(data.usage);

    logger.info('Chat request completed', {
      inputTokens,
      outputTokens,
      cost: cost.toFixed(6),
      contentLength: content.length,
      webSearchEnabled: this.toolOptions.enableWebSearch,
      toolsUsed: data.usage?.server_side_tool_usage_details,
    });

    return { content, usage: { inputTokens, outputTokens, cost } };
  }

  /**
   * ストリーミングレスポンスを取得（usage付き）
   */
  async *streamWithUsage(messages: LLMMessage[]): AsyncIterable<StreamYield> {
    logger.info('Starting stream request with usage tracking', {
      messageCount: messages.length,
      model: this.model,
      enableWebSearch: this.toolOptions.enableWebSearch,
    });

    const response = await this.fetchApi(this.buildRequestBody(messages, true));

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
    let finalUsage: StreamYield['usage'] | undefined;

    const processEvent = (event: XAIStreamEvent): ProcessEventResult | null => {
      // テキストチャンク
      if (event.type === 'response.output_text.delta' && event.delta) {
        chunkCount++;
        totalLength += event.delta.length;
        return { chunk: event.delta };
      }

      // 思考プロセス（thinking）のリアルタイム更新
      if (event.type === 'response.reasoning_content.delta' && event.delta) {
        chunkCount++;
        totalLength += event.delta.length;
        return { thinking: event.delta };
      }

      // ツール呼び出し開始
      if (event.type === 'response.output_item.added' && event.item) {
        const toolCall = this.parseToolCallItem(event.item, 'running');
        if (toolCall) return { toolCall };
      }

      // ツール呼び出し完了
      if (event.type === 'response.output_item.done' && event.item) {
        const toolCall = this.parseToolCallItem(event.item, 'completed');
        if (toolCall) return { toolCall };
      }

      // 推論ステップ - サーバー側で分割して送信
      if (event.type === 'response.reasoning' && event.response?.reasoning?.summary) {
        const summary = event.response.reasoning.summary;
        const totalTokens = event.response.usage?.output_tokens_details?.reasoning_tokens;
        
        // サブステップに分割
        const steps = parseReasoningSteps(summary, totalTokens);
        
        // 複数ステップを順番に返す（呼び出し側でfor...ofで処理）
        return { reasoningSteps: steps };
      }

      // usage情報（response.completedイベント）
      if (event.type === 'response.completed' && event.response?.usage) {
        const usage = event.response.usage;
        const cost = this.calcCost(usage);
        finalUsage = { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, cost };

        logger.info('Stream usage received', {
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          cost: cost.toFixed(6),
          toolUsage: usage.server_side_tool_usage_details,
        });

        if (usage.server_side_tool_usage_details) {
          return { toolUsage: usage.server_side_tool_usage_details };
        }
      }

      return null;
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          logger.info('Stream completed', { chunkCount, totalLength });
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event: ')) continue;
          if (!trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            if (finalUsage) yield { usage: finalUsage };
            return;
          }

          try {
            const yieldValue = processEvent(JSON.parse(data) as XAIStreamEvent);
            if (yieldValue) {
              // reasoningStepsが複数ある場合は個別にyield
              if ('reasoningSteps' in yieldValue && Array.isArray(yieldValue.reasoningSteps)) {
                for (const step of yieldValue.reasoningSteps) {
                  yield { reasoning: step };
                }
              } else {
                yield yieldValue as StreamYield;
              }
            }
          } catch {
            // malformed chunkは無視
          }
        }
      }

      // 残バッファを処理
      if (buffer.trim().startsWith('data: ')) {
        const data = buffer.trim().slice(6);
        if (data !== '[DONE]') {
          try {
            const yieldValue = processEvent(JSON.parse(data) as XAIStreamEvent);
            if (yieldValue) {
              // reasoningStepsが複数ある場合は個別にyield
              if ('reasoningSteps' in yieldValue && Array.isArray(yieldValue.reasoningSteps)) {
                for (const step of yieldValue.reasoningSteps) {
                  yield { reasoning: step };
                }
              } else {
                yield yieldValue as StreamYield;
              }
            }
          } catch {
            // Ignore
          }
        }
      }

      if (finalUsage) yield { usage: finalUsage };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * ストリーミングレスポンスを取得（後方互換性）
   */
  async *stream(messages: LLMMessage[]): AsyncIterable<string> {
    for await (const { chunk } of this.streamWithUsage(messages)) {
      if (chunk) yield chunk;
    }
  }
}

/**
 * ストリーム全体を消費してcontent + usageを返す
 */
export async function streamWithUsageTracking(
  client: GrokClient,
  messages: LLMMessage[]
): Promise<{ content: string; usage?: { inputTokens: number; outputTokens: number; cost: number } }> {
  let content = '';
  let finalUsage: { inputTokens: number; outputTokens: number; cost: number } | undefined;

  for await (const { chunk, usage } of client.streamWithUsage(messages)) {
    if (chunk) content += chunk;
    if (usage) finalUsage = usage;
  }

  return { content, usage: finalUsage };
}
