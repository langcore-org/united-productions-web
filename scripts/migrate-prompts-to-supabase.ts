/**
 * Neon → Supabase プロンプトデータ移行スクリプト
 * 移行対象: system_prompts, system_prompt_versions, feature_prompts
 *
 * 注意: NeonのIDはcuid、SupabaseはUUIDのため、マッピングテーブルを使用
 */

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local" });

const NEON_DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface NeonSystemPrompt {
  id: string;
  key: string;
  name: string;
  description: string | null;
  content: string;
  category: string;
  isActive: boolean;
  currentVersion: number;
  changedBy: string | null;
  changeNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface NeonSystemPromptVersion {
  id: string;
  promptId: string;
  version: number;
  content: string;
  changedBy: string | null;
  changeNote: string | null;
  createdAt: Date;
}

interface NeonFeaturePrompt {
  id: string;
  featureId: string;
  promptKey: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

async function migrate() {
  console.log("🚀 プロンプトデータ移行を開始します...\n");

  // Neon DBクライアント
  const neonClient = new Client({
    connectionString: NEON_DATABASE_URL,
  });

  // Supabaseクライアント
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // IDマッピング（Neon cuid → Supabase UUID）
  const promptIdMapping = new Map<string, string>();

  try {
    await neonClient.connect();

    // ===== Step 1: system_prompts 移行 =====
    console.log("📝 SystemPromptsを移行中...");
    const { rows: neonPrompts } = await neonClient.query<NeonSystemPrompt>(
      'SELECT * FROM "SystemPrompt"',
    );
    console.log(`  ${neonPrompts.length}件のプロンプトを検出`);

    if (neonPrompts.length > 0) {
      const migratedPrompts = neonPrompts.map((prompt) => {
        const newId = randomUUID();
        promptIdMapping.set(prompt.id, newId);
        return {
          id: newId,
          key: prompt.key,
          name: prompt.name,
          description: prompt.description,
          content: prompt.content,
          category: prompt.category,
          is_active: prompt.isActive,
          current_version: prompt.currentVersion,
          changed_by: null, // 旧ユーザーIDはSupabaseに存在しないためNULL
          change_note: prompt.changeNote,
          created_at: prompt.createdAt.toISOString(),
          updated_at: prompt.updatedAt.toISOString(),
        };
      });

      const { error } = await supabase.from("system_prompts").insert(migratedPrompts);
      if (error) {
        console.error("  ❌ SystemPrompts移行失敗:", error);
      } else {
        console.log(`  ✅ ${neonPrompts.length}件のSystemPromptsを移行`);
      }
    }

    // ===== Step 2: system_prompt_versions 移行 =====
    console.log("\n📚 SystemPromptVersionsを移行中...");
    const { rows: neonVersions } = await neonClient.query<NeonSystemPromptVersion>(
      'SELECT * FROM "SystemPromptVersion"',
    );
    console.log(`  ${neonVersions.length}件のバージョンを検出`);

    if (neonVersions.length > 0) {
      const migratedVersions = neonVersions.map((version) => {
        const newPromptId = promptIdMapping.get(version.promptId);
        if (!newPromptId) {
          console.warn(`  ⚠️ マッピングが見つかりません: promptId=${version.promptId}`);
        }
        return {
          id: randomUUID(),
          prompt_id: newPromptId || randomUUID(), // マッピングがない場合は新規UUID
          version: version.version,
          content: version.content,
          changed_by: version.changedBy, // TEXT型なのでそのまま
          change_note: version.changeNote,
          created_at: version.createdAt.toISOString(),
        };
      });

      const { error } = await supabase.from("system_prompt_versions").insert(migratedVersions);
      if (error) {
        console.error("  ❌ SystemPromptVersions移行失敗:", error);
      } else {
        console.log(`  ✅ ${neonVersions.length}件のSystemPromptVersionsを移行`);
      }
    }

    // ===== Step 3: feature_prompts 移行 =====
    console.log("\n🔗 FeaturePromptsを移行中...");
    const { rows: neonFeatures } = await neonClient.query<NeonFeaturePrompt>(
      'SELECT * FROM "FeaturePrompt"',
    );
    console.log(`  ${neonFeatures.length}件の機能マッピングを検出`);

    if (neonFeatures.length > 0) {
      const migratedFeatures = neonFeatures.map((feature) => ({
        id: randomUUID(),
        feature_id: feature.featureId,
        prompt_key: feature.promptKey,
        description: feature.description,
        is_active: feature.isActive,
        created_at: feature.createdAt.toISOString(),
        updated_at: feature.updatedAt.toISOString(),
      }));

      const { error } = await supabase.from("feature_prompts").insert(migratedFeatures);
      if (error) {
        console.error("  ❌ FeaturePrompts移行失敗:", error);
      } else {
        console.log(`  ✅ ${neonFeatures.length}件のFeaturePromptsを移行`);
      }
    }

    // ===== マッピング情報保存 =====
    console.log("\n💾 マッピング情報を保存...");
    const mappingData = Array.from(promptIdMapping.entries()).map(([neonId, supabaseId]) => ({
      neon_id: neonId,
      supabase_id: supabaseId,
    }));

    const fs = await import("node:fs");
    fs.writeFileSync("prompt-id-mapping-backup.json", JSON.stringify(mappingData, null, 2));
    console.log("  ✅ prompt-id-mapping-backup.jsonに保存");

    console.log("\n✨ プロンプトデータ移行が完了しました！");

    // ===== 検証 =====
    console.log("\n🔍 データ整合性を検証中...");
    const checks = [
      { name: "SystemPrompts", table: "system_prompts", expected: neonPrompts.length },
      {
        name: "SystemPromptVersions",
        table: "system_prompt_versions",
        expected: neonVersions.length,
      },
      { name: "FeaturePrompts", table: "feature_prompts", expected: neonFeatures.length },
    ];

    for (const check of checks) {
      const { count, error } = await supabase
        .from(check.table)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.log(`  ❌ ${check.name}: エラー - ${error.message}`);
      } else if (count !== check.expected) {
        console.log(`  ⚠️ ${check.name}: ${count}件（期待値: ${check.expected}件）`);
      } else {
        console.log(`  ✅ ${check.name}: ${count}件（一致）`);
      }
    }
  } catch (error) {
    console.error("\n💥 移行中にエラーが発生しました:", error);
    process.exit(1);
  } finally {
    await neonClient.end();
  }
}

migrate();
