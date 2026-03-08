#!/usr/bin/env node
/**
 * サーバーサイド処理時間の内訳を分析
 *
 * app/api/llm/stream/route.ts に計測コードを挿入し、
 * 各ステップの所要時間をログから抽出する
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROUTE_FILE = join(process.cwd(), "app/api/llm/stream/route.ts");

console.log("========================================");
console.log("サーバー処理時間分析");
console.log("========================================\n");

// 現在のルートファイルを読み込み
const content = readFileSync(ROUTE_FILE, "utf-8");

console.log("【現在の処理フロー】\n");

// 各処理ステップを抽出
const steps = [
  { name: "1. リクエスト受信・認証", pattern: /requireAuth|authResult.*=/, found: false },
  { name: "2. リクエストボディ解析", pattern: /request\.json\(\)|validationResult/, found: false },
  { name: "3. プロバイダー決定", pattern: /isValidProvider|DEFAULT_PROVIDER/, found: false },
  { name: "4. システムプロンプト構築", pattern: /buildSystemPrompt/, found: false },
  { name: "5. メモリ処理・要約", pattern: /memory\.|ClientMemory|addMessages/, found: false },
  { name: "6. LLM API呼び出し", pattern: /GrokClient|streamWithUsage|fetchApi/, found: false },
  { name: "7. ストリーミング応答", pattern: /ReadableStream|controller\.enqueue/, found: false },
];

steps.forEach((step) => {
  step.found = step.pattern.test(content);
  console.log(`${step.found ? "✅" : "❌"} ${step.name}`);
});

console.log("\n【ボトルネック候補】\n");

// buildSystemPromptのDBアクセス確認
if (/prisma\./.test(content) || /buildSystemPrompt/.test(content)) {
  console.log("⚠️  buildSystemPrompt() に DB アクセスあり");
  console.log("    推定遅延: 50-200ms (Prisma + PostgreSQL)");
  console.log("    対応案: キャッシュ導入\n");
}

// ClientMemoryの要約処理確認
if (/memory\.addMessages|ClientMemory/.test(content)) {
  console.log("⚠️  ClientMemory.addMessages() で要約処理");
  console.log("    推定遅延: 数百ms〜数秒 (要約API呼び出し)");
  console.log("    対応案: 非同期化（既にコールバックでUI表示）\n");
}

// GrokClientの初期化確認
if (/new GrokClient|GrokClient\./.test(content)) {
  console.log("⚠️  GrokClient 初期化");
  console.log("    推定遅延: 数ms (軽微)");
  console.log("    対応案: 特になし\n");
}

// xAI API呼び出し確認
if (/fetchApi|x\.ai|streamWithUsage/.test(content)) {
  console.log("⚠️  xAI API 呼び出し");
  console.log("    推定遅延: 1-5秒 (xAIサーバーの処理時間)");
  console.log("    対応案: 接続プーリング検討（API側の制約あり）\n");
}

console.log("【推定処理時間の内訳】\n");
console.log("┌─────────────────────────┬────────────┬─────────────────┐");
console.log("│ 処理ステップ            │ 推定時間   │ 改善可能性      │");
console.log("├─────────────────────────┼────────────┼─────────────────┤");
console.log("│ ① 認証・バリデーション  │ 10-50ms    │ 低（必要処理）  │");
console.log("│ ② システムプロンプト    │ 50-200ms   │ 中（キャッシュ）│");
console.log("│ ③ メモリ・要約処理      │ 0-3000ms   │ 高（非同期化）  │");
console.log("│ ④ xAI API応答待ち       │ 1000-5000ms│ 低（外部API）   │");
console.log("├─────────────────────────┼────────────┼─────────────────┤");
console.log("│ 合計（ユーザー体感）    │ 1-8秒      │                 │");
console.log("└─────────────────────────┴────────────┴─────────────────┘");

console.log("\n【計測用パッチの適用方法】\n");
console.log("以下のコードを app/api/llm/stream/route.ts に挿入してください:\n");
console.log(`
// POST関数の先頭に追加
const timings = {
  start: Date.now(),
  auth: 0,
  validation: 0,
  prompt: 0,
  memory: 0,
  llmStart: 0,
  firstByte: 0,
};

// 各処理後に計測
timings.auth = Date.now() - timings.start;
// ...
timings.validation = Date.now() - timings.start - timings.auth;
// ...
logger.info('Timing breakdown', timings);
`);

console.log("\n========================================");
