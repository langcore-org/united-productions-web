/**
 * cost_in_usd_ticks の換算ロジック検証
 *
 * ツールなし・最小トークンで呼んで、既知の単価から計算した値と比較する
 */
import { readFileSync } from "node:fs";

const envContent = readFileSync(".env.local", "utf-8");
const API_KEY = envContent.match(/XAI_API_KEY=(.+)/)?.[1].trim();
const BASE_URL = "https://api.x.ai/v1";

// 公式単価 (per million tokens)
// grok-4-1-fast-reasoning: $0.20 input ($0.05 cached), $0.50 output
const PRICE = {
  input: 0.2,
  input_cached: 0.05, // キャッシュ済みトークンは割引
  output: 0.5,
};

async function callNoTools(prompt: string) {
  const res = await fetch(`${BASE_URL}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: "grok-4-1-fast-reasoning",
      input: [{ role: "user", content: prompt }],
      // tools なし → ツールコスト = $0
    }),
  });
  const data = await res.json();
  return data.usage;
}

async function main() {
  console.log("=== cost_in_usd_ticks 換算ロジック検証 ===\n");
  console.log("前提: ツールなし呼び出しで token cost のみを分離して検証\n");

  // 極力短い応答になるようなプロンプト
  const prompt = "「はい」とだけ答えてください。";

  console.log(`プロンプト: "${prompt}"`);
  const usage = await callNoTools(prompt);
  console.log("\n--- usage ---");
  console.log(JSON.stringify(usage, null, 2));

  const ticks = usage.cost_in_usd_ticks;
  const inputTokens = usage.input_tokens;
  const cachedTokens = usage.input_tokens_details?.cached_tokens ?? 0;
  const outputTokens = usage.output_tokens;
  const reasoningTokens = usage.output_tokens_details?.reasoning_tokens ?? 0;
  const nonCachedInput = inputTokens - cachedTokens;

  console.log("\n--- トークン内訳 ---");
  console.log(`input total:    ${inputTokens}`);
  console.log(`  cached:       ${cachedTokens}`);
  console.log(`  non-cached:   ${nonCachedInput}`);
  console.log(`output total:   ${outputTokens}`);
  console.log(`  reasoning:    ${reasoningTokens}`);
  console.log(`  completion:   ${outputTokens - reasoningTokens}`);

  console.log("\n--- cost_in_usd_ticks 換算候補 ---");
  const divisors = [
    1_000,
    10_000,
    100_000,
    1_000_000,
    10_000_000,
    100_000_000,
    1_000_000_000, // 現在の実装
  ];
  for (const div of divisors) {
    const cost = ticks / div;
    console.log(`  / ${div.toLocaleString().padStart(15)}: $${cost.toFixed(8)}`);
  }

  console.log("\n--- 期待コスト (ツールなし) ---");
  // パターンA: reasoning も output 単価で計算
  const costA =
    (nonCachedInput / 1_000_000) * PRICE.input +
    (cachedTokens / 1_000_000) * PRICE.input_cached +
    (outputTokens / 1_000_000) * PRICE.output;
  console.log(`パターンA (reasoning=output単価): $${costA.toFixed(8)}`);

  // パターンB: reasoning は別単価 (仮に $3/M)
  const costB =
    (nonCachedInput / 1_000_000) * PRICE.input +
    (cachedTokens / 1_000_000) * PRICE.input_cached +
    ((outputTokens - reasoningTokens) / 1_000_000) * PRICE.output +
    (reasoningTokens / 1_000_000) * 3.0;
  console.log(`パターンB (reasoning=$3/M):       $${costB.toFixed(8)}`);

  // パターンC: reasoning なし (cached にも full 単価)
  const costC = (inputTokens / 1_000_000) * PRICE.input + (outputTokens / 1_000_000) * PRICE.output;
  console.log(`パターンC (cached割引なし):       $${costC.toFixed(8)}`);

  console.log("\n--- 現在の実装の結果 ---");
  const currentImpl = ticks / 1_000_000_000;
  console.log(`cost_in_usd_ticks / 1B = $${currentImpl.toFixed(8)}`);

  console.log("\n--- 最も近い divisor を探す ---");
  const targets = [costA, costB, costC];
  for (const [i, target] of targets.entries()) {
    const impliedDiv = ticks / target;
    console.log(
      `パターン${["A", "B", "C"][i]} ($${target.toFixed(6)}) に対する divisor: ${impliedDiv.toFixed(0)}`,
    );
  }
}

main().catch(console.error);
