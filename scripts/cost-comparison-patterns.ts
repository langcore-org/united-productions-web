/**
 * 複数パターンでの grok-4-1 vs grok-4.20 コスト比較
 */
import { readFileSync } from "node:fs";

const envContent = readFileSync(".env.local", "utf-8");
const API_KEY = envContent.match(/XAI_API_KEY=(.+)/)?.[1].trim();
const BASE_URL = "https://api.x.ai/v1";

const MODELS = ["grok-4-1-fast-reasoning", "grok-4.20-multi-agent-beta-latest"] as const;

interface TestCase {
  name: string;
  prompt: string;
  tools?: { type: string }[];
}

const TEST_CASES: TestCase[] = [
  {
    name: "A: シンプル質問（ツールなし）",
    prompt: "東京タワーの高さは何メートルですか？",
  },
  {
    name: "B: ファクトチェック（web_search）",
    prompt: "2026年の日本の総理大臣は誰ですか？",
    tools: [{ type: "web_search" }],
  },
  {
    name: "C: エビデンス調査（web+x_search）",
    prompt:
      "「睡眠時間が6時間以下だと認知症リスクが高まる」という説は正しいですか？信頼できるソースを提示してください。",
    tools: [{ type: "web_search" }, { type: "x_search" }],
  },
  {
    name: "D: 人物リサーチ（web+x_search）",
    prompt:
      "最近SNSで話題になっている料理系インフルエンサーを5人教えてください。フォロワー数や特徴も含めて。",
    tools: [{ type: "web_search" }, { type: "x_search" }],
  },
  {
    name: "E: 複雑な調査（web+x_search）",
    prompt:
      "2026年3月に放送予定のテレビ朝日のゴールデンタイム特番を全てリストアップしてください。放送日時、タイトル、出演者を含めて。",
    tools: [{ type: "web_search" }, { type: "x_search" }],
  },
];

interface Result {
  model: string;
  testName: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  costTicks: number;
  costUsd: number;
  webSearchCalls: number;
  xSearchCalls: number;
  durationMs: number;
  contentLength: number;
  error?: string;
}

async function callModel(model: string, tc: TestCase): Promise<Result> {
  const start = Date.now();
  const result: Result = {
    model,
    testName: tc.name,
    inputTokens: 0,
    cachedTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    costTicks: 0,
    costUsd: 0,
    webSearchCalls: 0,
    xSearchCalls: 0,
    durationMs: 0,
    contentLength: 0,
  };

  try {
    const body: Record<string, unknown> = {
      model,
      input: [{ role: "user", content: tc.prompt }],
    };
    if (tc.tools) body.tools = tc.tools;

    const res = await fetch(`${BASE_URL}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      result.error = `HTTP ${res.status}`;
      result.durationMs = Date.now() - start;
      return result;
    }

    const data = await res.json();
    const u = data.usage;

    result.inputTokens = u.input_tokens ?? 0;
    result.cachedTokens = u.input_tokens_details?.cached_tokens ?? 0;
    result.outputTokens = u.output_tokens ?? 0;
    result.reasoningTokens = u.output_tokens_details?.reasoning_tokens ?? 0;
    result.costTicks = u.cost_in_usd_ticks ?? 0;
    result.costUsd = result.costTicks / 10_000_000_000;
    result.webSearchCalls = u.server_side_tool_usage_details?.web_search_calls ?? 0;
    result.xSearchCalls = u.server_side_tool_usage_details?.x_search_calls ?? 0;

    // content length
    const msgOutput = data.output?.find((o: Record<string, unknown>) => o.type === "message");
    if (msgOutput?.content) {
      result.contentLength = (msgOutput.content as { text?: string }[])
        .map((c) => c.text ?? "")
        .join("").length;
    }
  } catch (err) {
    result.error = String(err);
  }

  result.durationMs = Date.now() - start;
  return result;
}

async function main() {
  if (!API_KEY) {
    console.error("XAI_API_KEY not set");
    process.exit(1);
  }

  console.log("=== grok-4-1 vs grok-4.20 コスト比較（複数パターン） ===\n");

  const allResults: Result[] = [];

  for (const tc of TEST_CASES) {
    console.log(`\n--- ${tc.name} ---`);

    for (const model of MODELS) {
      const shortName = model.includes("4.20") ? "4.20" : "4.1";
      process.stdout.write(`  [${shortName}] ...`);
      const r = await callModel(model, tc);
      allResults.push(r);

      if (r.error) {
        console.log(` ERROR: ${r.error}`);
      } else {
        console.log(
          ` ${r.durationMs}ms | $${r.costUsd.toFixed(6)} | in=${r.inputTokens}(c=${r.cachedTokens}) out=${r.outputTokens}(r=${r.reasoningTokens}) | web=${r.webSearchCalls} x=${r.xSearchCalls} | ${r.contentLength}文字`,
        );
      }
    }
  }

  // 比較テーブル出力
  console.log("\n\n===== 比較テーブル =====\n");

  console.log(
    "| テストケース | モデル | コスト | 時間 | input (cached) | output (reasoning) | web | x | 文字数 |",
  );
  console.log("|---|---|---|---|---|---|---|---|---|");

  for (const r of allResults) {
    const shortName = r.model.includes("4.20") ? "grok-4.20" : "grok-4.1";
    console.log(
      `| ${r.testName} | ${shortName} | $${r.costUsd.toFixed(6)} | ${(r.durationMs / 1000).toFixed(1)}s | ${r.inputTokens} (${r.cachedTokens}) | ${r.outputTokens} (${r.reasoningTokens}) | ${r.webSearchCalls} | ${r.xSearchCalls} | ${r.contentLength} |`,
    );
  }

  // コスト比率
  console.log("\n\n===== コスト比率 =====\n");
  console.log("| テストケース | grok-4.1 | grok-4.20 | 倍率 |");
  console.log("|---|---|---|---|");

  for (const tc of TEST_CASES) {
    const r41 = allResults.find((r) => r.testName === tc.name && r.model.includes("4-1"));
    const r420 = allResults.find((r) => r.testName === tc.name && r.model.includes("4.20"));
    if (r41 && r420 && !r41.error && !r420.error) {
      const ratio = r420.costUsd / r41.costUsd;
      console.log(
        `| ${tc.name} | $${r41.costUsd.toFixed(6)} | $${r420.costUsd.toFixed(6)} | ${ratio.toFixed(1)}x |`,
      );
    }
  }
}

main().catch(console.error);
