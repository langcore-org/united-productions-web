/**
 * Phase 1: xAI API ツール実行結果の構造調査スクリプト
 *
 * 使用法:
 *   npx tsx scripts/investigate-tool-response.ts
 */

import { createClientLogger } from "@/lib/logger";

const logger = createClientLogger("InvestigateTool");

// 環境変数を直接読み込み
import { readFileSync } from "node:fs";

const envContent = readFileSync(".env.local", "utf-8");
const apiKeyMatch = envContent.match(/XAI_API_KEY=(.+)/);
const API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : process.env.XAI_API_KEY;
const BASE_URL = "https://api.x.ai/v1";

interface XAIStreamEvent {
  type: string;
  sequence_number?: number;
  delta?: string;
  content_index?: number;
  item_id?: string;
  output_index?: number;
  response?: {
    id: string;
    output: Array<{
      id: string;
      type: string;
      status?: string;
      name?: string;
      input?: string;
      result?: unknown; // ← 調査対象
      call_id?: string;
      content?: Array<{
        type: string;
        text?: string;
        annotations?: Array<{
          type: string;
          url?: string;
          title?: string;
        }>;
      }>;
    }>;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
      server_side_tool_usage_details?: {
        web_search_calls: number;
        x_search_calls: number;
        code_interpreter_calls: number;
      };
    };
  };
  item?: {
    id: string;
    type: string;
    status: string;
    name?: string;
    input?: string;
    result?: unknown; // ← 調査対象
    call_id?: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

async function streamWithCapture(): Promise<void> {
  if (!API_KEY) {
    logger.error("XAI_API_KEY is not set");
    process.exit(1);
  }

  const requestBody = {
    model: "grok-4-1-fast-reasoning",
    input: [
      {
        role: "user",
        content: "OpenAI GPT-5について最新情報を検索して",
      },
    ],
    stream: true,
    tools: [{ type: "web_search" }, { type: "x_search" }],
  };

  logger.info("Starting API request", { model: requestBody.model });
  console.log("\n=== Request ===");
  console.log(JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error("API error", { status: response.status, error });
    process.exit(1);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    logger.error("No response body");
    process.exit(1);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  const capturedEvents: XAIStreamEvent[] = [];
  let contentBuffer = "";

  console.log("\n=== Streaming Events ===\n");

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("event: ")) {
          const eventType = trimmed.slice(7);
          console.log(`\n[Event Type: ${eventType}]`);
          continue;
        }
        if (!trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          console.log("\n[Stream Complete]");
          break;
        }

        try {
          const event: XAIStreamEvent = JSON.parse(data);
          capturedEvents.push(event);

          // イベントタイプ別の処理
          switch (event.type) {
            case "response.output_text.delta":
              if (event.delta) {
                contentBuffer += event.delta;
                process.stdout.write(event.delta);
              }
              break;

            case "response.output_item.added":
              console.log("\n\n📡 [Tool Call Started]");
              console.log(JSON.stringify(event.item, null, 2));
              break;

            case "response.output_item.done":
              console.log("\n\n✅ [Tool Call Completed]");
              console.log(JSON.stringify(event.item, null, 2));

              // result フィールドの詳細調査
              if (event.item?.result) {
                console.log("\n🔍 [RESULT FIELD DETECTED]");
                console.log("Type:", typeof event.item.result);
                console.log("Content:", JSON.stringify(event.item.result, null, 2));

                // 結果の構造を分析
                analyzeResult(event.item.result);
              } else {
                console.log("\n⚠️ [NO RESULT FIELD]");
              }
              break;

            case "response.completed":
              console.log("\n\n🏁 [Response Completed]");
              if (event.response?.usage) {
                console.log("Usage:", JSON.stringify(event.response.usage, null, 2));
              }
              if (event.response?.output) {
                console.log("\n📦 [Final Output Items]");
                for (const item of event.response.output) {
                  console.log(`\n- Type: ${item.type}`);
                  if (item.result) {
                    console.log("  Has result:", true);
                    console.log("  Result preview:", JSON.stringify(item.result).slice(0, 200));
                  }
                  if (item.content) {
                    console.log("  Content items:", item.content.length);
                    for (const c of item.content) {
                      if (c.annotations) {
                        console.log("  Annotations:", JSON.stringify(c.annotations, null, 2));
                      }
                    }
                  }
                }
              }
              break;
          }
        } catch (err) {
          console.log("Parse error:", trimmed.slice(0, 100));
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // 最終レポート
  console.log("\n\n=== Investigation Report ===\n");

  const toolCallEvents = capturedEvents.filter(
    (e) => e.type === "response.output_item.done" && e.item?.type?.includes("_call"),
  );

  console.log(`Total events captured: ${capturedEvents.length}`);
  console.log(`Tool call events: ${toolCallEvents.length}`);

  for (const event of toolCallEvents) {
    console.log(`\n--- Tool: ${event.item?.type} ---`);
    console.log("Input:", event.item?.input);
    console.log("Has result:", !!event.item?.result);

    if (event.item?.result) {
      console.log("Result keys:", Object.keys(event.item.result as object));
    }
  }

  // レスポンス全体の構造を保存
  const fs = await import("fs");
  const outputPath = "/tmp/xai_tool_investigation.json";
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        events: capturedEvents,
        summary: {
          totalEvents: capturedEvents.length,
          toolCalls: toolCallEvents.length,
          contentLength: contentBuffer.length,
        },
      },
      null,
      2,
    ),
  );

  console.log(`\n📁 Full capture saved to: ${outputPath}`);
}

function analyzeResult(result: unknown): void {
  if (typeof result !== "object" || result === null) {
    console.log("Result is not an object:", typeof result);
    return;
  }

  const obj = result as Record<string, unknown>;

  console.log("\n📊 Result Analysis:");
  console.log("Keys:", Object.keys(obj));

  // 各ツールタイプの特徴的なフィールドをチェック
  if ("results" in obj && Array.isArray(obj.results)) {
    console.log(`\nFound 'results' array with ${obj.results.length} items`);
    if (obj.results.length > 0) {
      console.log("First result sample:", JSON.stringify(obj.results[0], null, 2).slice(0, 500));
    }
  }

  if ("posts" in obj && Array.isArray(obj.posts)) {
    console.log(`\nFound 'posts' array with ${obj.posts.length} items`);
  }

  if ("output" in obj) {
    console.log("\nFound 'output' field:", typeof obj.output);
  }

  if ("sources" in obj && Array.isArray(obj.sources)) {
    console.log(`\nFound 'sources' array with ${obj.sources.length} items`);
  }

  // ネストされた構造を探索
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value) && value.length > 0) {
      console.log(`\nArray '${key}': ${value.length} items`);
      if (typeof value[0] === "object") {
        console.log("  First item keys:", Object.keys(value[0] as object));
      }
    }
  }
}

streamWithCapture().catch((err) => {
  logger.error("Investigation failed", { error: String(err) });
  process.exit(1);
});
