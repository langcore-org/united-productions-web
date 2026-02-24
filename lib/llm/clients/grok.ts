/**
 * Grok LLM Client
 *
 * xAI Responses APIを直接使用したLLMクライアント実装（LangChainバイパス）
 * Agent Tools（web_search, x_search, code_execution）に対応
 *
 * 復元元: git commit b8297cf
 * 改修: ツール設定簡略化・SSEイベント形式変更・collections_search削除・x_search_callイベント型修正
 */

import { createClientLogger } from "@/lib/logger";
import { getProviderInfo } from "../config";
import type {
  GrokToolType,
  LLMClient,
  LLMMessage,
  LLMProvider,
  LLMResponse,
  SSEEvent,
} from "../types";

const logger = createClientLogger("GrokClient");

export const DEFAULT_GROK_TOOLS: GrokToolType[] = ["web_search", "x_search", "code_execution"];

export const TOOL_DISPLAY_NAMES: Record<GrokToolType, string> = {
  web_search: "Web検索",
  x_search: "X検索",
  code_execution: "コード実行",
};

/**
 * xAI APIのイベントタイプ → GrokToolType のマッピング
 * 調査済み: x_search は x_search_call（custom_tool_call ではない）
 */
const XAI_TOOL_TYPE_MAP: Record<string, GrokToolType> = {
  web_search_call: "web_search",
  x_search_call: "x_search",
  code_interpreter_call: "code_execution",
};

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
        id: string;
        type: "message";
        role: string;
        content: Array<{
          type: "output_text";
          text: string;
          annotations?: Array<{ type: "url_citation"; url: string; title?: string }>;
        }>;
        status: string;
      }
    | {
        id: string;
        type: string;
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
    input_tokens_details?: { cached_tokens: number };
    output_tokens_details?: { reasoning_tokens: number };
    cost_in_usd_ticks?: number;
    server_side_tool_usage_details?: {
      web_search_calls: number;
      x_search_calls: number;
      code_interpreter_calls: number;
      file_search_calls: number;
      mcp_calls: number;
      document_search_calls: number;
    };
  };
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
  usage?: XAIResponse["usage"];
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
 * Grokクライアント
 */
export class GrokClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private provider: LLMProvider;
  private baseUrl = "https://api.x.ai/v1";
  private tools: GrokToolType[];

  constructor(provider: LLMProvider, tools?: GrokToolType[]) {
    this.provider = provider;
    this.model = this.getModelName(provider);
    this.tools = tools ?? DEFAULT_GROK_TOOLS;

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      logger.error("XAI_API_KEY environment variable is not set");
      throw new Error("XAI_API_KEY environment variable is not set");
    }
    this.apiKey = apiKey;
    logger.info("GrokClient initialized", { provider, model: this.model, tools: this.tools });
  }

  // ─── プライベートヘルパー ───────────────────────────────────

  private getModelName(provider: LLMProvider): string {
    switch (provider) {
      case "grok-4-1-fast-reasoning":
        return "grok-4-1-fast-reasoning";
      case "grok-4-0709":
        return "grok-4-0709";
      default:
        throw new Error(`Unsupported Grok provider: ${provider}`);
    }
  }

  private getToolsConfig(): Array<{ type: string }> {
    return this.tools.map((t) => ({ type: t }));
  }

  private convertMessages(messages: LLMMessage[]): Array<{ role: string; content: string }> {
    return messages.map((msg) => ({ role: msg.role, content: msg.content }));
  }

  private calcCost(usage: XAIResponse["usage"]): number {
    if (usage.cost_in_usd_ticks) {
      return Number((usage.cost_in_usd_ticks / 1_000_000_000).toFixed(6));
    }
    const info = getProviderInfo(this.provider);
    return Number(
      (
        (usage.input_tokens / 1_000_000) * info.inputPrice +
        (usage.output_tokens / 1_000_000) * info.outputPrice
      ).toFixed(6),
    );
  }

  private buildRequestBody(messages: LLMMessage[], stream = false) {
    return {
      model: this.model,
      input: this.convertMessages(messages),
      ...(stream ? { stream: true } : {}),
      tools: this.getToolsConfig(),
    };
  }

  private async fetchApi(body: object): Promise<Response> {
    return fetch(`${this.baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
  }

  /**
   * xAI ストリームイベントの item をパースして tool_call SSEイベントに変換
   * XAI_TOOL_TYPE_MAP にないタイプは null を返す
   */
  private parseToolCallEvent(
    item: NonNullable<XAIStreamEvent["item"]>,
    status: "running" | "completed",
  ): (SSEEvent & { type: "tool_call" }) | null {
    const toolType = XAI_TOOL_TYPE_MAP[item.type];
    if (!toolType) return null;

    return {
      type: "tool_call",
      id: item.id,
      name: toolType,
      displayName: TOOL_DISPLAY_NAMES[toolType],
      status,
      ...(item.input ? { input: item.input } : {}),
    };
  }

  // ─── パブリックAPI ────────────────────────────────────────

  /**
   * チャット完了を取得（Responses API使用）
   */
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    logger.info("Starting chat request", { messageCount: messages.length, model: this.model });

    const response = await this.fetchApi(this.buildRequestBody(messages));

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("xAI API error", { status: response.status, error: errorText });
      throw new Error(`xAI API error: ${response.status} ${errorText}`);
    }

    const data: XAIResponse = await response.json();

    const messageOutput = data.output.find((item) => item.type === "message");
    const content =
      messageOutput && "content" in messageOutput
        ? messageOutput.content.map((c) => c.text).join("")
        : "";

    const inputTokens = data.usage?.input_tokens ?? 0;
    const outputTokens = data.usage?.output_tokens ?? 0;
    const cost = this.calcCost(data.usage);

    return { content, usage: { inputTokens, outputTokens, cost } };
  }

  /**
   * 新SSEイベント形式でストリーミングレスポンスを取得
   *
   * yields:
   *   { type: 'start' }
   *   { type: 'tool_call', id, name, displayName, status, input? }
   *   { type: 'content', delta }
   *   { type: 'done', usage }
   *   { type: 'error', message }
   */
  async *streamWithUsage(messages: LLMMessage[]): AsyncGenerator<SSEEvent> {
    logger.info("Starting stream request", { messageCount: messages.length, model: this.model });

    yield { type: "start" };

    const response = await this.fetchApi(this.buildRequestBody(messages, true));

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("xAI API streaming error", { status: response.status, error: errorText });
      yield { type: "error", message: `xAI API error: ${response.status} ${errorText}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", message: "Response body is not readable" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    const processEvent = (event: XAIStreamEvent): SSEEvent | null => {
      // テキストチャンク
      if (event.type === "response.output_text.delta" && event.delta) {
        return { type: "content", delta: event.delta };
      }

      // ツール呼び出し開始
      if (event.type === "response.output_item.added" && event.item) {
        return this.parseToolCallEvent(event.item, "running");
      }

      // ツール呼び出し完了
      if (event.type === "response.output_item.done" && event.item) {
        return this.parseToolCallEvent(event.item, "completed");
      }

      // 完了（usage含む）
      if (event.type === "response.completed" && event.response?.usage) {
        const usage = event.response.usage;
        const cost = this.calcCost(usage);
        const details = usage.server_side_tool_usage_details;
        const toolCalls: Record<string, number> = {};
        if (details) {
          if (details.web_search_calls) toolCalls.web_search = details.web_search_calls;
          if (details.x_search_calls) toolCalls.x_search = details.x_search_calls;
          if (details.code_interpreter_calls)
            toolCalls.code_execution = details.code_interpreter_calls;
        }
        return {
          type: "done",
          usage: {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            cost,
            toolCalls,
          },
        };
      }

      return null;
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("event: ")) continue;
          if (!trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") return;

          try {
            const sseEvent = processEvent(JSON.parse(data) as XAIStreamEvent);
            if (sseEvent) yield sseEvent;
          } catch {
            // malformed chunk は無視
          }
        }
      }

      // 残バッファを処理
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data: ")) {
        const data = trimmed.slice(6);
        if (data !== "[DONE]") {
          try {
            const sseEvent = processEvent(JSON.parse(data) as XAIStreamEvent);
            if (sseEvent) yield sseEvent;
          } catch {
            // 無視
          }
        }
      }
    } catch (err) {
      yield { type: "error", message: err instanceof Error ? err.message : "Stream error" };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * ストリーミングレスポンスを取得（後方互換性 - テキストのみ）
   */
  async *stream(messages: LLMMessage[]): AsyncGenerator<string> {
    for await (const event of this.streamWithUsage(messages)) {
      if (event.type === "content") yield event.delta;
    }
  }
}
