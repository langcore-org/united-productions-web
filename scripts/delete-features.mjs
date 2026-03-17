import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const featuresToDelete = ["research-location", "research-info", "na-script"];

async function deleteFeatures() {
  console.log("=== DBデータ削除 ===\n");

  for (const featureId of featuresToDelete) {
    try {
      const { error } = await supabase.from("feature_prompts").delete().eq("feature_id", featureId);

      if (error) throw error;
      console.log(`✅ FeaturePrompt: ${featureId} - 削除完了`);
    } catch (error) {
      console.error(`❌ ${featureId} FeaturePrompt削除エラー:`, error.message);
    }
  }

  const keysToDelete = ["RESEARCH_LOCATION", "RESEARCH_INFO", "TRANSCRIPT", "TRANSCRIPT_FORMAT"];

  for (const key of keysToDelete) {
    try {
      const { data: prompt } = await supabase
        .from("system_prompts")
        .select("id")
        .eq("key", key)
        .single();

      if (prompt) {
        await supabase.from("system_prompt_versions").delete().eq("prompt_id", prompt.id);

        await supabase.from("system_prompts").delete().eq("key", key);

        console.log(`✅ SystemPrompt: ${key} - 削除`);
      } else {
        console.log(`⚠️ SystemPrompt: ${key} - 既に削除済みまたは存在しない`);
      }
    } catch (error) {
      console.error(`❌ ${key} 削除エラー:`, error.message);
    }
  }

  console.log("\n=== 削除完了 ===");
}

deleteFeatures().catch(console.error);
