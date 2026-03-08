/**
 * 評価結果をhistory/に保存
 * エージェントがJSONで評価結果を渡すと、Markdownファイルとして記録する
 *
 * 使い方: node prompt-tuning/scripts/save-result.mjs '<JSON>'
 * 例:
 *   node prompt-tuning/scripts/save-result.mjs '{"key":"RESEARCH_CAST","tests":[{"name":"テスト名","passed":true,"input":"入力テキスト","output":"推定出力の要約","scores":{"確認フロー":{"score":4,"reason":"理由"},"出力フォーマット":{"score":4,"reason":"理由"}},"note":"総合コメント"}]}'
 *
 * scores のキーはセッションで定義した評価軸を自由に使用できます（固定名不要）
 */

import { writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const jsonArg = process.argv[2];

if (!jsonArg) {
  console.error('Usage: node prompt-tuning/scripts/save-result.mjs \'{"key":"...","tests":[...]}\'');
  process.exit(1);
}

let result;
try {
  result = JSON.parse(jsonArg);
} catch {
  console.error("❌ 無効なJSON形式です");
  process.exit(1);
}

const { key, tests } = result;

if (!key || !Array.isArray(tests)) {
  console.error('❌ JSONに "key" と "tests" が必要です');
  process.exit(1);
}

const passed = tests.filter((t) => t.passed).length;
const total = tests.length;

const historyDir = join(process.cwd(), "prompt-tuning", key, "history");
mkdirSync(historyDir, { recursive: true });

// attempt番号を決定（既存ファイル数 + 1）
const existing = readdirSync(historyDir).filter((f) => f.startsWith("attempt-"));
const nextAttempt = existing.length + 1;

const fileName = `attempt-${nextAttempt}_score-${passed}-${total}.md`;
const filePath = join(historyDir, fileName);

const date = new Date().toISOString().replace("T", " ").slice(0, 16);

/**
 * テスト1件分のMarkdownセクションを生成
 */
function renderTest(t) {
  const icon = t.passed ? "✅" : "❌";
  const sections = [`### ${icon} ${t.name}`];

  // 入力
  if (t.input) {
    sections.push(``, `**入力**`, ``, "```", t.input, "```");
  }

  // 推定出力
  if (t.output) {
    sections.push(``, `**推定出力**`, ``, t.output);
  }

  // 評価スコア（理由付き・軸は動的）
  if (t.scores && Object.keys(t.scores).length > 0) {
    const entries = Object.entries(t.scores);
    const total = entries.reduce((sum, [, v]) => sum + (v?.score ?? 0), 0);
    sections.push(``, `**評価スコア** （合計: ${total}点）`, ``);
    sections.push(
      `| 軸 | 点数 | 理由 |`,
      `|---|---|---|`,
      ...entries.map(([name, v]) => `| ${name} | ${v?.score ?? "-"}/5 | ${v?.reason ?? ""} |`)
    );
  }

  // 総合コメント
  if (t.note) {
    sections.push(``, `**総合コメント**: ${t.note}`);
  }

  return sections.join("\n");
}

const lines = [
  `# チューニング結果: ${key}`,
  ``,
  `> **試行**: attempt-${nextAttempt}`,
  `> **スコア**: ${passed}/${total}`,
  `> **日時**: ${date}`,
  ``,
  `---`,
  ``,
  `## テスト結果`,
  ``,
  ...tests.map((t) => renderTest(t)).join("\n\n---\n\n").split("\n"),
  ``,
  `---`,
  ``,
  `## サマリー`,
  ``,
  passed === total
    ? `✅ 全テスト合格`
    : `⚠️ ${total - passed}件のテストが未達\n\n### 未達のテストケース\n\n${tests
        .filter((t) => !t.passed)
        .map((t) => `- **${t.name}**: ${t.note ?? ""}`)
        .join("\n")}`,
  ``,
];

writeFileSync(filePath, lines.join("\n"), "utf-8");

console.log(`✅ 保存しました: prompt-tuning/${key}/history/${fileName}`);
console.log(`📊 スコア: ${passed}/${total}`);

if (passed < total) {
  console.log(`\n未達のテストケース:`);
  tests
    .filter((t) => !t.passed)
    .forEach((t) => console.log(`  ❌ ${t.name}: ${t.note ?? ""}`));
}
