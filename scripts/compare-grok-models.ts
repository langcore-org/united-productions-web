/**
 * grok-4-1-fast-reasoning vs grok-4.20-multi-agent-beta-latest 比較調査スクリプト
 *
 * 使用法:
 *   npx tsx scripts/compare-grok-models.ts
 */

import { readFileSync, writeFileSync } from "node:fs";

const envContent = readFileSync(".env.local", "utf-8");
const apiKeyMatch = envContent.match(/XAI_API_KEY=(.+)/);
const API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : process.env.XAI_API_KEY;
const BASE_URL = "https://api.x.ai/v1";

const MODELS = ["grok-4-1-fast-reasoning", "grok-4.20-multi-agent-beta-latest"] as const;

const TEST_QUERY =
  "テレビ番組「ザ・ノンフィクション」（フジテレビ）の最新放送回について、放送日・タイトル・内容を教えてください。";

interface StreamResult {
  model: string;
  content: string;
  eventTypes: string[];
  toolCalls: Array<{ type: string; input: string }>;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    toolUsageDetails?: Record<string, number>;
  } | null;
  durationMs: number;
  error?: string;
}

async function callModel(model: string): Promise<StreamResult> {
  const startTime = Date.now();
  const result: StreamResult = {
    model,
    content: "",
    eventTypes: [],
    toolCalls: [],
    usage: null,
    durationMs: 0,
  };

  try {
    const requestBody = {
      model,
      input: [{ role: "user" as const, content: TEST_QUERY }],
      stream: true,
      tools: [{ type: "web_search" }, { type: "x_search" }],
    };

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
      result.error = `HTTP ${response.status}: ${error.slice(0, 300)}`;
      result.durationMs = Date.now() - startTime;
      return result;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      result.error = "No response body";
      result.durationMs = Date.now() - startTime;
      return result;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") break;

          try {
            const event = JSON.parse(data);
            const eventType = event.type as string;

            if (!result.eventTypes.includes(eventType)) {
              result.eventTypes.push(eventType);
            }

            switch (eventType) {
              case "response.output_text.delta":
                if (event.delta) {
                  result.content += event.delta;
                }
                break;

              case "response.output_item.done":
                if (event.item?.type?.includes("_call")) {
                  result.toolCalls.push({
                    type: event.item.type,
                    input:
                      event.item.input === undefined
                        ? "(undefined)"
                        : typeof event.item.input === "string"
                          ? event.item.input
                          : JSON.stringify(event.item.input),
                  });
                }
                break;

              case "response.completed":
                if (event.response?.usage) {
                  const u = event.response.usage;
                  result.usage = {
                    inputTokens: u.input_tokens ?? 0,
                    outputTokens: u.output_tokens ?? 0,
                    totalTokens: u.total_tokens ?? 0,
                    toolUsageDetails: u.server_side_tool_usage_details,
                  };
                }
                break;
            }
          } catch (_e) {
            // parse error - skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (err) {
    result.error = String(err);
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

async function main() {
  if (!API_KEY) {
    console.error("XAI_API_KEY is not set");
    process.exit(1);
  }

  console.log("=== xAI モデル比較調査 ===");
  console.log(`クエリ: ${TEST_QUERY}`);
  console.log(`対象モデル: ${MODELS.join(", ")}\n`);

  const results: StreamResult[] = [];

  for (const model of MODELS) {
    console.log(`\n--- [${model}] 呼び出し中... ---`);
    const result = await callModel(model);
    results.push(result);

    if (result.error) {
      console.log(`ERROR: ${result.error}`);
    } else {
      console.log(`完了 (${result.durationMs}ms)`);
      console.log(`ツール呼び出し数: ${result.toolCalls.length}`);
      console.log(`レスポンス文字数: ${result.content.length}`);
      console.log(`イベントタイプ: ${result.eventTypes.join(", ")}`);
      if (result.usage) {
        console.log(
          `トークン: input=${result.usage.inputTokens}, output=${result.usage.outputTokens}, total=${result.usage.totalTokens}`,
        );
        if (result.usage.toolUsageDetails) {
          console.log(`ツール使用詳細: ${JSON.stringify(result.usage.toolUsageDetails)}`);
        }
      }
    }
  }

  // 比較レポート
  console.log("\n\n========== 比較レポート ==========\n");

  const [r1, r2] = results;

  console.log("【レスポンス速度】");
  console.log(`  ${r1.model}: ${r1.durationMs}ms`);
  console.log(`  ${r2.model}: ${r2.durationMs}ms`);
  const faster = r1.durationMs < r2.durationMs ? r1.model : r2.model;
  console.log(`  → ${faster} が速い`);

  console.log("\n【ツール使用】");
  for (const r of results) {
    console.log(`  ${r.model}:`);
    if (r.toolCalls.length === 0) {
      console.log("    ツール呼び出しなし");
    } else {
      for (const tc of r.toolCalls) {
        console.log(`    - ${tc.type}: ${tc.input.slice(0, 80)}`);
      }
    }
  }

  console.log("\n【トークン使用量】");
  for (const r of results) {
    if (r.usage) {
      console.log(`  ${r.model}: input=${r.usage.inputTokens}, output=${r.usage.outputTokens}`);
    } else {
      console.log(`  ${r.model}: データなし`);
    }
  }

  console.log("\n【レスポンス品質 (先頭500文字)】");
  for (const r of results) {
    console.log(`\n  --- ${r.model} ---`);
    if (r.error) {
      console.log(`  ERROR: ${r.error}`);
    } else {
      console.log(r.content.slice(0, 500));
    }
  }

  console.log("\n【レスポンス全文比較】");
  for (const r of results) {
    console.log(`\n  --- ${r.model} (全文: ${r.content.length}文字) ---`);
    if (r.error) {
      console.log(`  ERROR: ${r.error}`);
    } else {
      console.log(r.content);
    }
  }

  // JSONで保存
  const outputPath = "/tmp/grok_model_comparison.json";
  writeFileSync(outputPath, JSON.stringify({ query: TEST_QUERY, results }, null, 2));
  console.log(`\n完全なデータを保存: ${outputPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
