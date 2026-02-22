/**
 * ストリーミング用コールバックハンドラー
 * 
 * LangChain Agentの実行過程をイベントとして送信
 * 
 * @created 2026-02-22 11:30
 * @updated 2026-02-22 12:00
 */

import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

/**
 * コールバック設定
 */
const CALLBACK_CONFIG = {
  /** イベント送信間隔（ms） */
  EMIT_INTERVAL_MS: 100,
  /** バッファの最大サイズ */
  MAX_BUFFER_SIZE: 10000,
} as const;

/**
 * ストリーミングイベントの型
 */
export interface StreamingEvent {
  /** リクエスト受理 */
  accepted?: boolean;
  /** ステップ開始 */
  stepStart?: {
    step: number;
    id: string;
    title: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    type: 'thinking' | 'search' | 'analysis' | 'synthesis' | 'complete';
  };
  /** ステップ更新 */
  stepUpdate?: {
    id: string;
    content?: string;
    status?: 'pending' | 'running' | 'completed' | 'error';
  };
  /** ツール呼び出しイベント */
  toolCallEvent?: {
    id: string;
    type: string;
    name?: string;
    input?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
  };
  /** コンテンツチャンク */
  content?: string;
  /** エラー */
  error?: string;
  /** 完了 */
  done?: boolean;
  /** 使用状況 */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

/**
 * ストリーミングコールバックハンドラー
 * 
 * Agentの実行過程をリアルタイムでイベントとして送信
 */
export class StreamingCallbackHandler extends BaseCallbackHandler {
  name = 'streaming_callback_handler';
  
  private stepCounter = 0;
  private currentStepId: string | null = null;
  private toolCalls = new Map<string, { name: string; input: string }>();
  private buffer = '';
  private lastEmitTime = 0;

  constructor(private onEvent: (event: StreamingEvent) => void) {
    super();
  }

  /**
   * LLM開始時
   */
  async handleLLMStart(
    llm: unknown,
    prompts: string[],
    runId: string
  ): Promise<void> {
    this.stepCounter++;
    this.currentStepId = `step-${this.stepCounter}-${runId}`;
    
    // 思考ステップ開始イベントを送信
    this.onEvent({
      stepStart: {
        step: this.stepCounter,
        id: this.currentStepId,
        title: this.getStepTitle(this.stepCounter),
        status: 'running',
        type: this.getStepType(this.stepCounter),
      },
    });
  }

  /**
   * 新しいトークン生成時
   */
  async handleLLMNewToken(
    token: string,
    idx: unknown,
    runId: string
  ): Promise<void> {
    this.buffer += token;
    
    // スロットリング：一定間隔でイベントを送信
    const now = Date.now();
    if (now - this.lastEmitTime < CALLBACK_CONFIG.EMIT_INTERVAL_MS) {
      return;
    }
    this.lastEmitTime = now;

    // バッファサイズの制限
    if (this.buffer.length > CALLBACK_CONFIG.MAX_BUFFER_SIZE) {
      this.buffer = this.buffer.slice(-CALLBACK_CONFIG.MAX_BUFFER_SIZE);
    }

    // ステップ内容を更新
    if (this.currentStepId) {
      this.onEvent({
        stepUpdate: {
          id: this.currentStepId,
          content: this.buffer,
        },
      });
    }

    // 最終回答としても送信（後で分離可能）
    this.onEvent({ content: token });
  }

  /**
   * LLM完了時
   */
  async handleLLMEnd(
    output: unknown,
    runId: string
  ): Promise<void> {
    // ステップ完了イベントを送信
    if (this.currentStepId) {
      this.onEvent({
        stepUpdate: {
          id: this.currentStepId,
          status: 'completed',
        },
      });
    }

    // バッファをクリア
    this.buffer = '';
  }

  /**
   * LLMエラー時
   */
  async handleLLMError(error: Error, runId: string): Promise<void> {
    if (this.currentStepId) {
      this.onEvent({
        stepUpdate: {
          id: this.currentStepId,
          status: 'error',
        },
      });
    }
    this.onEvent({ error: error.message });
  }

  /**
   * ツール開始時
   */
  async handleToolStart(
    tool: unknown,
    input: string,
    runId: string
  ): Promise<void> {
    // toolからnameを取得（Serialized型の場合）
    const toolName = typeof tool === 'object' && tool !== null && 'name' in tool 
      ? String((tool as { name: unknown }).name) 
      : 'unknown';
    
    this.toolCalls.set(runId, { name: toolName, input });

    // ツール呼び出し開始イベントを送信
    this.onEvent({
      toolCallEvent: {
        id: runId,
        type: toolName,
        name: this.getToolDisplayName(toolName),
        input: typeof input === 'string' ? input : JSON.stringify(input),
        status: 'running',
      },
    });
  }

  /**
   * ツール完了時
   */
  async handleToolEnd(output: string, runId: string): Promise<void> {
    const toolCall = this.toolCalls.get(runId);
    if (!toolCall) return;

    // ツール呼び出し完了イベントを送信
    this.onEvent({
      toolCallEvent: {
        id: runId,
        type: toolCall.name,
        name: this.getToolDisplayName(toolCall.name),
        input: toolCall.input,
        status: 'completed',
      },
    });

    this.toolCalls.delete(runId);
  }

  /**
   * ツールエラー時
   */
  async handleToolError(error: Error, runId: string): Promise<void> {
    const toolCall = this.toolCalls.get(runId);
    if (!toolCall) return;

    this.onEvent({
      toolCallEvent: {
        id: runId,
        type: toolCall.name,
        name: this.getToolDisplayName(toolCall.name),
        input: toolCall.input,
        status: 'failed',
      },
    });

    this.toolCalls.delete(runId);
  }

  /**
   * Chain開始時
   */
  async handleChainStart(
    chain: unknown,
    inputs: unknown,
    runId: string
  ): Promise<void> {
    // Agent全体の開始（必要に応じて）
  }

  /**
   * Chain完了時
   */
  async handleChainEnd(
    outputs: unknown,
    runId: string
  ): Promise<void> {
    // Agent全体の完了
    this.onEvent({ done: true });
  }

  /**
   * Chainエラー時
   */
  async handleChainError(error: Error, runId: string): Promise<void> {
    this.onEvent({ error: error.message, done: true });
  }

  /**
   * ステップタイトルを取得
   */
  private getStepTitle(stepNumber: number): string {
    const titles = ['分析と計画', '情報収集', '実行', '統合', '回答生成'];
    return titles[(stepNumber - 1) % titles.length] || `ステップ ${stepNumber}`;
  }

  /**
   * ステップタイプを取得
   */
  private getStepType(stepNumber: number): 'thinking' | 'search' | 'analysis' | 'synthesis' | 'complete' {
    const types: Array<'thinking' | 'search' | 'analysis' | 'synthesis' | 'complete'> = [
      'analysis',
      'search',
      'thinking',
      'synthesis',
      'complete',
    ];
    return types[(stepNumber - 1) % types.length] || 'thinking';
  }

  /**
   * ツール表示名を取得
   */
  private getToolDisplayName(toolName: string): string {
    const displayNames: Record<string, string> = {
      web_search: 'Web検索',
      x_search: 'X検索',
      calculator: '計算',
      current_time: '現在時刻',
      word_count: '文字数カウント',
    };
    return displayNames[toolName] || toolName;
  }
}

export default StreamingCallbackHandler;
