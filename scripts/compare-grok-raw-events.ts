/**
 * grok-4.20-multi-agent の生ストリームイベントを完全キャプチャ
 *
 * 使用法:
 *   npx tsx scripts/compare-grok-raw-events.ts
 */

import { readFileSync, writeFileSync } from "node:fs";

const envContent = readFileSync(".env.local", "utf-8");
const apiKeyMatch = envContent.match(/XAI_API_KEY=(.+)/);
const API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : process.env.XAI_API_KEY;
const BASE_URL = "https://api.x.ai/v1";

const TEST_QUERY =
  "テレビ番組「ザ・ノンフィクション」（フジテレビ）の最新放送回について、放送日・タイトル・内容を教えてください。";

async function captureAllEvents(model: string): Promise<object[]> {
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
    throw new Error(`HTTP ${response.status}: ${error.slice(0, 300)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  const allEvents: object[] = [];
  let currentEventType = "";

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
          currentEventType = trimmed.slice(7);
          continue;
        }
        if (!trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") break;

        try {
          const event = JSON.parse(data);
          allEvents.push({ _sse_event: currentEventType, ...event });
        } catch (_e) {
          // skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return allEvents;
}

async function main() {
  if (!API_KEY) {
    console.error("XAI_API_KEY is not set");
    process.exit(1);
  }

  const model = "grok-4.20-multi-agent-beta-latest";
  console.log(`\n=== ${model} 完全イベントキャプチャ ===`);
  console.log(`クエリ: ${TEST_QUERY}\n`);

  const events = await captureAllEvents(model);

  console.log(`総イベント数: ${events.length}`);

  // イベントタイプ別集計
  const byType = new Map<string, number>();
  for (const e of events) {
    const t = (e as Record<string, string>).type ?? "unknown";
    byType.set(t, (byType.get(t) ?? 0) + 1);
  }

  console.log("\n【イベントタイプ別件数】");
  for (const [type, count] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}件`);
  }

  // output_item.added / done の全詳細
  const itemEvents = events.filter((e) => {
    const t = (e as Record<string, string>).type;
    return t === "response.output_item.added" || t === "response.output_item.done";
  });

  console.log(`\n【output_item イベント一覧 (${itemEvents.length}件)】`);
  for (const e of itemEvents) {
    const ev = e as Record<string, unknown>;
    const item = ev.item as Record<string, unknown> | undefined;
    if (item) {
      console.log(`\n  [${ev.type}]`);
      console.log(`    type: ${item.type}`);
      console.log(`    id: ${item.id}`);
      console.log(`    status: ${item.status}`);
      if (item.name) console.log(`    name: ${item.name}`);
      if (item.input !== undefined) {
        const inputStr = typeof item.input === "string" ? item.input : JSON.stringify(item.input);
        console.log(`    input: ${inputStr.slice(0, 200)}`);
      }
      if (item.result !== undefined) {
        console.log(`    result keys: ${Object.keys(item.result as object).join(", ")}`);
      }
      if (item.content) {
        const content = item.content as unknown[];
        console.log(`    content items: ${content.length}`);
      }
    }
  }

  // web_search_call イベントの詳細
  const searchEvents = events.filter((e) => {
    const t = (e as Record<string, string>).type;
    return t?.startsWith("response.web_search_call");
  });
  console.log(`\n【web_search_call イベント (${searchEvents.length}件)】`);
  for (const e of searchEvents) {
    const ev = e as Record<string, unknown>;
    console.log(`  [${ev.type}] item_id=${ev.item_id} status=${ev.status ?? "-"}`);
  }

  // response.completed の全データ
  const completedEvent = events.find(
    (e) => (e as Record<string, string>).type === "response.completed",
  );
  if (completedEvent) {
    const ev = completedEvent as Record<string, unknown>;
    const resp = ev.response as Record<string, unknown> | undefined;
    if (resp) {
      console.log("\n【response.completed の詳細】");
      console.log(`  usage: ${JSON.stringify(resp.usage)}`);
      console.log(`  output items: ${(resp.output as unknown[] | undefined)?.length ?? 0}`);
      if (resp.output) {
        for (const item of resp.output as Record<string, unknown>[]) {
          console.log(`\n  output item:`);
          console.log(`    type: ${item.type}`);
          console.log(`    id: ${item.id}`);
          console.log(`    status: ${item.status}`);
          if (item.content) {
            const content = item.content as Record<string, unknown>[];
            console.log(`    content[0] type: ${content[0]?.type}`);
            if (content[0]?.annotations) {
              const anns = content[0].annotations as unknown[];
              console.log(`    annotations count: ${anns.length}`);
              if (anns.length > 0) {
                console.log(`    first annotation: ${JSON.stringify(anns[0]).slice(0, 200)}`);
              }
            }
          }
        }
      }
    }
  }

  // 全イベントをファイルに保存
  const outputPath = `/tmp/grok_multi_agent_events_${Date.now()}.json`;
  writeFileSync(outputPath, JSON.stringify({ model, query: TEST_QUERY, events }, null, 2));
  console.log(`\n完全イベントデータ保存: ${outputPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
