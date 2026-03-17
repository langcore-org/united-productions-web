/**
 * cost_in_usd_ticks が実際の請求額かどうかを検証
 *
 * 1. 既知の billing/usage エンドポイントを探索
 * 2. 複数パターンで API を呼んで cost_in_usd_ticks の一貫性を検証
 */
import { readFileSync } from "node:fs";

const envContent = readFileSync(".env.local", "utf-8");
const API_KEY = envContent.match(/XAI_API_KEY=(.+)/)?.[1].trim();
const BASE_URL = "https://api.x.ai/v1";

async function tryEndpoint(path: string): Promise<{ status: number; body: string }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  const body = await res.text();
  return { status: res.status, body: body.slice(0, 500) };
}

async function callApi(model: string, prompt: string, tools?: { type: string }[]) {
  const body: Record<string, unknown> = {
    model,
    input: [{ role: "user", content: prompt }],
  };
  if (tools) body.tools = tools;

  const res = await fetch(`${BASE_URL}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function main() {
  console.log("=== Part 1: billing/usage エンドポイント探索 ===\n");

  const endpoints = [
    "/usage",
    "/organization/usage",
    "/dashboard/billing/usage",
    "/billing",
    "/account",
    "/models",
    "/organization",
  ];

  for (const ep of endpoints) {
    const { status, body } = await tryEndpoint(ep);
    console.log(`GET ${ep}: ${status} → ${body.slice(0, 150)}`);
  }

  console.log("\n=== Part 2: cost_in_usd_ticks の一貫性検証 ===\n");

  // テスト1: ツールなし・最小トークン
  console.log("--- テスト1: ツールなし・最小トークン ---");
  const r1 = await callApi("grok-4-1-fast-reasoning", "1+1=?");
  const u1 = r1.usage;
  console.log(`input=${u1.input_tokens} (cached=${u1.input_tokens_details?.cached_tokens}) output=${u1.output_tokens} (reasoning=${u1.output_tokens_details?.reasoning_tokens})`);
  console.log(`cost_in_usd_ticks=${u1.cost_in_usd_ticks}`);
  const cachedTokens1 = u1.input_tokens_details?.cached_tokens ?? 0;
  const nonCached1 = u1.input_tokens - cachedTokens1;
  const expected1 = (nonCached1 * 0.20 + cachedTokens1 * 0.05 + u1.output_tokens * 0.50) / 1_000_000;
  const actual1 = u1.cost_in_usd_ticks / 10_000_000_000;
  console.log(`期待(token only): $${expected1.toFixed(8)}  実測(/10B): $${actual1.toFixed(8)}  差: ${((actual1 / expected1 - 1) * 100).toFixed(1)}%`);

  // テスト2: ツールなし・やや長い応答
  console.log("\n--- テスト2: ツールなし・やや長い応答 ---");
  const r2 = await callApi("grok-4-1-fast-reasoning", "日本の都道府県を全て列挙してください。");
  const u2 = r2.usage;
  console.log(`input=${u2.input_tokens} (cached=${u2.input_tokens_details?.cached_tokens}) output=${u2.output_tokens} (reasoning=${u2.output_tokens_details?.reasoning_tokens})`);
  console.log(`cost_in_usd_ticks=${u2.cost_in_usd_ticks}`);
  const cachedTokens2 = u2.input_tokens_details?.cached_tokens ?? 0;
  const nonCached2 = u2.input_tokens - cachedTokens2;
  const expected2 = (nonCached2 * 0.20 + cachedTokens2 * 0.05 + u2.output_tokens * 0.50) / 1_000_000;
  const actual2 = u2.cost_in_usd_ticks / 10_000_000_000;
  console.log(`期待(token only): $${expected2.toFixed(8)}  実測(/10B): $${actual2.toFixed(8)}  差: ${((actual2 / expected2 - 1) * 100).toFixed(1)}%`);

  // テスト3: web_search 1回
  console.log("\n--- テスト3: web_search つき ---");
  const r3 = await callApi("grok-4-1-fast-reasoning", "xAI社の設立年は？", [{ type: "web_search" }]);
  const u3 = r3.usage;
  console.log(`input=${u3.input_tokens} (cached=${u3.input_tokens_details?.cached_tokens}) output=${u3.output_tokens} (reasoning=${u3.output_tokens_details?.reasoning_tokens})`);
  console.log(`cost_in_usd_ticks=${u3.cost_in_usd_ticks}`);
  console.log(`server_side_tool_usage_details=${JSON.stringify(u3.server_side_tool_usage_details)}`);
  const cachedTokens3 = u3.input_tokens_details?.cached_tokens ?? 0;
  const nonCached3 = u3.input_tokens - cachedTokens3;
  const tokenCost3 = (nonCached3 * 0.20 + cachedTokens3 * 0.05 + u3.output_tokens * 0.50) / 1_000_000;
  const webSearchCost3 = (u3.server_side_tool_usage_details?.web_search_calls ?? 0) * 5.0 / 1000;
  const expected3 = tokenCost3 + webSearchCost3;
  const actual3 = u3.cost_in_usd_ticks / 10_000_000_000;
  console.log(`期待(token+tool): $${expected3.toFixed(8)}  (token=$${tokenCost3.toFixed(8)} tool=$${webSearchCost3.toFixed(4)})`);
  console.log(`実測(/10B):       $${actual3.toFixed(8)}  差: ${((actual3 / expected3 - 1) * 100).toFixed(1)}%`);

  // テスト4: grok-4.20-multi-agent ツールなし
  console.log("\n--- テスト4: grok-4.20 ツールなし ---");
  const r4 = await callApi("grok-4.20-multi-agent-beta-latest", "1+1=?");
  const u4 = r4.usage;
  console.log(`input=${u4.input_tokens} (cached=${u4.input_tokens_details?.cached_tokens}) output=${u4.output_tokens} (reasoning=${u4.output_tokens_details?.reasoning_tokens})`);
  console.log(`cost_in_usd_ticks=${u4.cost_in_usd_ticks}`);
  console.log(`server_side_tool_usage_details=${JSON.stringify(u4.server_side_tool_usage_details)}`);
  const cachedTokens4 = u4.input_tokens_details?.cached_tokens ?? 0;
  const nonCached4 = u4.input_tokens - cachedTokens4;
  // grok-4.20: $2.00/M input, $6.00/M output, cached price unknown
  const tokenCost4_noCacheDiscount = (u4.input_tokens * 2.0 + u4.output_tokens * 6.0) / 1_000_000;
  const tokenCost4_25pctCache = (nonCached4 * 2.0 + cachedTokens4 * 0.5 + u4.output_tokens * 6.0) / 1_000_000;
  const webSearchCost4 = (u4.server_side_tool_usage_details?.web_search_calls ?? 0) * 5.0 / 1000;
  const actual4 = u4.cost_in_usd_ticks / 10_000_000_000;
  console.log(`実測(/10B):             $${actual4.toFixed(8)}`);
  console.log(`期待(cached割引なし):   $${(tokenCost4_noCacheDiscount + webSearchCost4).toFixed(8)}`);
  console.log(`期待(cached=25%):       $${(tokenCost4_25pctCache + webSearchCost4).toFixed(8)}`);

  // テスト5: 同じクエリを2回呼んで再現性確認
  console.log("\n--- テスト5: 再現性確認（同一クエリ2回） ---");
  const r5a = await callApi("grok-4-1-fast-reasoning", "こんにちは");
  const r5b = await callApi("grok-4-1-fast-reasoning", "こんにちは");
  console.log(`1回目: input=${r5a.usage.input_tokens} output=${r5a.usage.output_tokens} cost_ticks=${r5a.usage.cost_in_usd_ticks}`);
  console.log(`2回目: input=${r5b.usage.input_tokens} output=${r5b.usage.output_tokens} cost_ticks=${r5b.usage.cost_in_usd_ticks}`);
}

main().catch(console.error);
