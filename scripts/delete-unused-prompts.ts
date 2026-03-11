/**
 * 未使用プロンプト削除
 */

import { createAdminClient } from "@/lib/supabase/admin";

const UNUSED_PROMPTS = ["SCHEDULE_ACTOR", "SCHEDULE_STAFF", "SCHEDULE_SYSTEM", "SCHEDULE_VEHICLE"];

async function main() {
  console.log("=== 未使用プロンプト削除 ===\n");

  const supabase = createAdminClient();

  for (const key of UNUSED_PROMPTS) {
    const { data: prompt } = await supabase
      .from("system_prompts")
      .select("id")
      .eq("key", key)
      .single();

    if (!prompt) {
      console.log(`❌ ${key}: 既に存在しません`);
      continue;
    }

    console.log(`🗑️  ${key}`);

    await supabase.from("system_prompt_versions").delete().eq("prompt_id", prompt.id);

    await supabase.from("system_prompts").delete().eq("id", prompt.id);

    console.log(`   ✅ 削除完了\n`);
  }

  console.log("=== 削除完了 ===");
}

main();
