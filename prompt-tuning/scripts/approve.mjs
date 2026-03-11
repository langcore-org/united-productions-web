/**
 * draft.mdの内容を本番DBへ反映（新バージョンとして保存）
 * 最後の試行ファイルに _APPROVED を付ける
 *
 * 使い方: node prompt-tuning/scripts/approve.mjs <PROMPT_KEY> "<変更理由>"
 * 例:    node prompt-tuning/scripts/approve.mjs RESEARCH_CAST "Web検索指示を強化・出力フォーマットを統一"
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const key = process.argv[2];
const note = process.argv[3] ?? "";

if (!key) {
  console.error('Usage: node prompt-tuning/scripts/approve.mjs <PROMPT_KEY> "<変更理由>"');
  process.exit(1);
}

async function main() {
  const draftPath = join(process.cwd(), "prompt-tuning", key, "draft.md");
  let draftContent;
  try {
    draftContent = readFileSync(draftPath, "utf-8");
  } catch {
    console.error(`❌ draft.md が見つかりません: ${draftPath}`);
    console.error(`   先に init-session.mjs を実行してください`);
    process.exit(1);
  }

  const { data: prompt, error } = await supabase
    .from("system_prompts")
    .select("*")
    .eq("key", key)
    .single();

  if (error || !prompt) {
    console.error(`❌ プロンプト "${key}" がDBに見つかりません`);
    process.exit(1);
  }

  const { data: latest } = await supabase
    .from("system_prompt_versions")
    .select("version")
    .eq("prompt_id", prompt.id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const newVersion = (latest?.version ?? 0) + 1;

  await supabase.from("system_prompt_versions").insert({
    prompt_id: prompt.id,
    version: newVersion,
    content: draftContent,
    changed_by: "prompt-tuning",
    change_note: note || `prompt-tuningによる更新`,
  });

  await supabase
    .from("system_prompts")
    .update({
      content: draftContent,
      current_version: newVersion,
      change_note: note || `prompt-tuningによる更新`,
      changed_by: null,
    })
    .eq("id", prompt.id);

  const historyDir = join(process.cwd(), "prompt-tuning", key, "history");
  try {
    const files = readdirSync(historyDir)
      .filter((f) => f.startsWith("attempt-") && !f.includes("_APPROVED"))
      .sort();
    if (files.length > 0) {
      const last = files[files.length - 1];
      const approved = last.replace(".md", "_APPROVED.md");
      renameSync(join(historyDir, last), join(historyDir, approved));
      console.log(`✅ ${last} → ${approved}`);
    }
  } catch {
    // historyが空でも続行
  }

  console.log(`\n🎉 本番プロンプトを更新しました`);
  console.log(`   キー: ${key}`);
  console.log(`   新バージョン: v${newVersion}`);
  console.log(`   変更理由: ${note || "(未記入)"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
