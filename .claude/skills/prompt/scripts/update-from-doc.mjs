import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が未設定です");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const [, , key, reasonArg, ...rest] = process.argv;

  if (!key) {
    console.error(
      '使用方法: node .claude/skills/prompt/scripts/update-from-doc.mjs <PROMPT_KEY> "変更理由" [--file path/to/file.md]',
    );
    process.exit(1);
  }

  const reason = reasonArg || "docs/prompts からの内容更新";
  let filePath = null;

  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--file") {
      filePath = rest[i + 1] ?? null;
      break;
    }
  }

  const resolvedPath = filePath ?? path.join(process.cwd(), "docs", "prompts", `${key}.md`);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ ファイルが見つかりません: ${resolvedPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(resolvedPath, "utf8");

  if (!content.trim()) {
    console.error("❌ プロンプト内容が空です。");
    process.exit(1);
  }

  console.log(`📄 ファイルからプロンプトを読み込みました: ${resolvedPath}`);

  const { data: prompt, error: promptError } = await supabase
    .from("system_prompts")
    .select("id, key, current_version")
    .eq("key", key)
    .single();

  if (promptError) {
    console.error("❌ system_prompts の取得に失敗しました:", promptError.message);
    process.exit(1);
  }

  if (!prompt) {
    console.error(
      `❌ key="${key}" の system_prompts レコードが存在しません。先にレコードを作成してください。`,
    );
    process.exit(1);
  }

  const { data: latestVersionData, error: latestVersionError } = await supabase
    .from("system_prompt_versions")
    .select("version")
    .eq("prompt_id", prompt.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestVersionError) {
    console.error(
      "❌ system_prompt_versions の最新バージョン取得に失敗しました:",
      latestVersionError.message,
    );
    process.exit(1);
  }

  const nextVersion = (latestVersionData?.version ?? 0) + 1;

  const { error: insertError } = await supabase.from("system_prompt_versions").insert({
    prompt_id: prompt.id,
    version: nextVersion,
    content,
  });

  if (insertError) {
    console.error("❌ system_prompt_versions への挿入に失敗しました:", insertError.message);
    process.exit(1);
  }

  const { error: updateError } = await supabase
    .from("system_prompts")
    .update({ current_version: nextVersion })
    .eq("id", prompt.id);

  if (updateError) {
    console.error("❌ system_prompts.current_version の更新に失敗しました:", updateError.message);
    process.exit(1);
  }

  console.log("✅ プロンプトを更新しました");
  console.log(`   キー: ${key}`);
  console.log(`   新バージョン: v${nextVersion}`);
  console.log(`   変更理由: ${reason}`);
}

main().catch((error) => {
  console.error("❌ 実行時エラー:", error);
  process.exit(1);
});
