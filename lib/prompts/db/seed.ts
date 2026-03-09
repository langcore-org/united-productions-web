/**
 * 初期プロンプトデータ投入（Supabase版）
 *
 * @created 2026-02-22 12:30
 * @updated 2026-03-09 Supabase移行
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PROMPTS } from "../constants";

/**
 * 初期プロンプトデータをDBに投入
 * テーブルが空の場合のみ実行
 */
export async function seedPrompts(): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { count, error: countError } = await supabase
      .from("system_prompts")
      .select("*", { count: "exact", head: true });

    if (countError) throw countError;

    if ((count ?? 0) > 0) {
      console.log("[Prompts] Already seeded, skipping...");
      return;
    }

    console.log("[Prompts] Seeding default prompts...");
    for (const prompt of DEFAULT_PROMPTS) {
      const { data: created, error: insertError } = await supabase
        .from("system_prompts")
        .insert({
          id: prompt.id,
          key: prompt.key,
          name: prompt.name,
          description: prompt.description,
          content: prompt.content,
          category: prompt.category,
          current_version: 1,
        })
        .select()
        .single();

      if (insertError) {
        console.error(`  Failed to insert prompt "${prompt.key}":`, insertError);
        continue;
      }

      if (created) {
        await supabase.from("system_prompt_versions").insert({
          prompt_id: created.id,
          version: 1,
          content: prompt.content,
          changed_by: null,
          change_note: "Initial version",
        });
      }
    }

    console.log(`[Prompts] Seeded ${DEFAULT_PROMPTS.length} prompts`);
  } catch (error) {
    console.error("[Prompts] Failed to seed prompts:", error);
    throw error;
  }
}
