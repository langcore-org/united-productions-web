/**
 * DBから指定キーのプロンプトを取得して表示
 *
 * 使い方: node prompt-tuning/scripts/get.mjs <PROMPT_KEY>
 * 例:    node prompt-tuning/scripts/get.mjs RESEARCH_CAST
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const key = process.argv[2];

if (!key) {
  console.error("Usage: node prompt-tuning/scripts/get.mjs <PROMPT_KEY>");
  process.exit(1);
}

async function main() {
  const { data: prompt, error } = await supabase
    .from("system_prompts")
    .select("*")
    .eq("key", key)
    .single();

  if (error || !prompt) {
    console.error(`❌ プロンプト "${key}" が見つかりません`);
    process.exit(1);
  }

  const { data: versions } = await supabase
    .from("system_prompt_versions")
    .select("version, change_note, created_at")
    .eq("prompt_id", prompt.id)
    .order("version", { ascending: false })
    .limit(3);

  // 本文は system_prompt_versions に格納されている
  const { data: currentVersion } = await supabase
    .from("system_prompt_versions")
    .select("content")
    .eq("prompt_id", prompt.id)
    .eq("version", prompt.current_version)
    .single();

  console.log(`📋 ${prompt.name} (${prompt.key})`);
  console.log(`   バージョン: v${prompt.current_version}`);
  console.log(`   カテゴリ: ${prompt.category}`);
  console.log(`\nバージョン履歴 (直近3件):`);
  for (const v of versions || []) {
    console.log(
      `  v${v.version}: ${v.change_note ?? "-"} (${new Date(v.created_at).toISOString().slice(0, 10)})`,
    );
  }
  console.log(`\n--- プロンプト内容 ---\n`);
  console.log(currentVersion?.content ?? "(内容なし)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
