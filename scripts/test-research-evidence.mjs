/**
 * RESEARCH_EVIDENCE プロンプトのテストスクリプト
 * 実行: node scripts/test-research-evidence.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// .env.local から XAI_API_KEY を読み込む
const envContent = readFileSync(resolve(projectRoot, ".env.local"), "utf-8");
const apiKeyMatch = envContent.match(/^XAI_API_KEY=(.+)$/m);
if (!apiKeyMatch) {
  console.error("XAI_API_KEY が .env.local に見つかりません");
  process.exit(1);
}
const XAI_API_KEY = apiKeyMatch[1].trim();

// プロンプトファイルを読み込む
const systemPrompt = readFileSync(
  resolve(projectRoot, "docs/prompts/RESEARCH_EVIDENCE.md"),
  "utf-8"
);

const testQuery = process.argv[2] ?? "ヨーグルトの乳酸菌効果が食物繊維で爆増します";

console.log("=== RESEARCH_EVIDENCE プロンプトテスト ===");
console.log(`テストクエリ: ${testQuery}`);
console.log("モデル: grok-4-1-fast-reasoning");
console.log("ツール: web_search, x_search");
console.log("==========================================\n");

const response = await fetch("https://api.x.ai/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${XAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: "grok-4-1-fast-reasoning",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: testQuery },
    ],
    tools: [{ type: "web_search" }, { type: "x_search" }],
  }),
});

if (!response.ok) {
  const error = await response.text();
  console.error(`APIエラー: ${response.status}`, error);
  process.exit(1);
}

const data = await response.json();

// レスポンスを出力
const messageOutput = data.output?.find((item) => item.type === "message");
const content = messageOutput?.content?.map((c) => c.text).join("") ?? "";

console.log("=== レスポンス ===\n");
console.log(content);

console.log("\n=== 使用トークン ===");
console.log(`入力: ${data.usage?.input_tokens}`);
console.log(`出力: ${data.usage?.output_tokens}`);
const toolDetails = data.usage?.server_side_tool_usage_details;
if (toolDetails) {
  console.log(`Web検索: ${toolDetails.web_search_calls ?? 0}回`);
  console.log(`X検索: ${toolDetails.x_search_calls ?? 0}回`);
}
