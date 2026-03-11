/**
 * チューニングセッションを初期化
 * - DBから現在の本番プロンプトを取得してdraft.mdを作成
 * - history/ディレクトリを作成
 * - test-cases.mdがなければテンプレートを生成
 *
 * 使い方: node prompt-tuning/scripts/init-session.mjs <PROMPT_KEY>
 * 例:    node prompt-tuning/scripts/init-session.mjs RESEARCH_CAST
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const key = process.argv[2];

if (!key) {
  console.error("Usage: node prompt-tuning/scripts/init-session.mjs <PROMPT_KEY>");
  process.exit(1);
}

async function main() {
  const { data: prompt, error } = await supabase
    .from("system_prompts")
    .select("*")
    .eq("key", key)
    .single();

  if (error || !prompt) {
    console.error(`❌ プロンプト "${key}" がDBに見つかりません`);
    process.exit(1);
  }

  const baseDir = join(process.cwd(), "prompt-tuning", key);
  const historyDir = join(baseDir, "history");
  const draftPath = join(baseDir, "draft.md");
  const testCasesPath = join(baseDir, "test-cases.md");

  mkdirSync(historyDir, { recursive: true });

  if (!existsSync(draftPath)) {
    writeFileSync(draftPath, prompt.content, "utf-8");
    console.log(`✅ draft.md を作成しました（本番 v${prompt.current_version} のコピー）`);
  } else {
    console.log(`ℹ️  draft.md は既に存在します（既存のdraftを継続使用）`);
  }

  if (!existsSync(testCasesPath)) {
    const template = `# テストケース: ${key}

> プロンプトキー: \`${key}\`
> 最終更新: ${new Date().toISOString().slice(0, 10)}

---

## テストケース1: [名前]

### 入力

[実際に想定されるユーザーの入力テキストをここに記述]

### 期待する出力の基準

- [基準1（必須）]
- [基準2（必須）]
- [基準3（あると良い）]

### 重み

必須

---
`;
    writeFileSync(testCasesPath, template, "utf-8");
    console.log(`✅ test-cases.md のテンプレートを作成しました`);
  } else {
    console.log(`ℹ️  test-cases.md は既に存在します`);
  }

  console.log(`\n📋 プロンプト: ${prompt.name} (${key})`);
  console.log(`   本番バージョン: v${prompt.current_version}`);
  console.log(`   作業ディレクトリ: prompt-tuning/${key}/`);
  console.log(`\n次のステップ: prompt-tuning/${key}/test-cases.md を確認してください`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
