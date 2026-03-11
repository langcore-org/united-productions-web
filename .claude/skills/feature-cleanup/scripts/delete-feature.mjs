#!/usr/bin/env node
/**
 * Feature Cleanup - Delete Feature Script (Supabase版)
 *
 * 機能削除のための統合スクリプト
 * - ファイル削除
 * - コード参照削除
 * - DBデータ削除（Supabase）
 *
 * Usage:
 *   node delete-feature.mjs [FEATURE_ID]
 *   node delete-feature.mjs [FEATURE_ID] --dry-run
 *   node delete-feature.mjs [FEATURE_ID] --only-db
 *   node delete-feature.mjs [FEATURE_ID] --only-files
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const featureId = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
const onlyDb = process.argv.includes("--only-db");
const onlyFiles = process.argv.includes("--only-files");

if (!featureId) {
  console.error("Usage: node delete-feature.mjs [FEATURE_ID] [options]");
  console.error("");
  console.error("Options:");
  console.error("  --dry-run      実際には削除せず、削除対象を表示のみ");
  console.error("  --only-db      DBデータのみ削除");
  console.error("  --only-files   ファイルのみ削除");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function runCommand(cmd, ignoreError = true) {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", ignoreError ? "ignore" : "pipe"],
    });
  } catch (e) {
    return "";
  }
}

function logSection(title) {
  console.log(`\n=== ${title} ===`);
}

function logItem(status, message) {
  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
    skip: "⏭️",
  };
  console.log(`  ${icons[status] || "•"} ${message}`);
}

function detectFiles(featureId) {
  const files = [];
  const dirs = [];

  const patterns = [
    `app/(authenticated)/${featureId}`,
    `app/(authenticated)/${featureId}/page.tsx`,
    `app/(authenticated)/${featureId}/layout.tsx`,
    `app/api/${featureId}`,
    `app/api/${featureId}/route.ts`,
    `lib/${featureId}`,
    `components/${featureId}`,
    `hooks/use${featureId.replace(/(^|-)([a-z])/g, (_, __, letter) => letter.toUpperCase())}.ts`,
    `prompts/${featureId}.md`,
    `prompts/${featureId}-format.md`,
  ];

  for (const pattern of patterns) {
    if (existsSync(pattern)) {
      const isDir = !pattern.includes(".") || pattern.endsWith("/");
      if (isDir) {
        dirs.push(pattern);
      } else {
        files.push(pattern);
      }
    }
  }

  return { files, dirs };
}

function detectCodeRefs(featureId) {
  const searchPaths = ["app/", "lib/", "components/", "hooks/", "types/", "config/"];
  const refs = [];

  for (const path of searchPaths) {
    if (!existsSync(path)) continue;
    const result = runCommand(
      `grep -rn "${featureId}" ${path} --include="*.ts" --include="*.tsx" 2>/dev/null`,
    );
    if (result.trim()) {
      result
        .trim()
        .split("\n")
        .forEach((line) => {
          if (line) refs.push(line);
        });
    }
  }

  return refs;
}

async function detectDbData(featureId) {
  const data = { featurePrompts: [], systemPrompts: [] };

  const { data: featurePrompts } = await supabase
    .from("feature_prompts")
    .select("*")
    .eq("feature_id", featureId);
  data.featurePrompts = featurePrompts || [];

  const possibleKeys = [
    featureId.toUpperCase(),
    featureId.toUpperCase().replace(/-/g, "_"),
    featureId.toLowerCase(),
    featureId.toLowerCase().replace(/-/g, "_"),
  ];

  const { data: systemPrompts } = await supabase
    .from("system_prompts")
    .select("*")
    .in("key", possibleKeys);
  data.systemPrompts = systemPrompts || [];

  return data;
}

async function main() {
  console.log(`=== 機能削除: ${featureId} ===`);

  if (dryRun) {
    console.log("\n🔍 【DRY RUNモード】実際の削除は行いません\n");
  }

  let filesToDelete = { files: [], dirs: [] };
  let codeRefs = [];
  let dbData = { featurePrompts: [], systemPrompts: [] };

  if (!onlyDb) {
    logSection("削除対象ファイル検出");
    filesToDelete = detectFiles(featureId);

    if (filesToDelete.files.length === 0 && filesToDelete.dirs.length === 0) {
      logItem("info", "削除対象のファイル/ディレクトリはありません");
    } else {
      filesToDelete.files.forEach((f) => logItem("warning", f));
      filesToDelete.dirs.forEach((d) => logItem("warning", d));
      logItem(
        "info",
        `合計: ${filesToDelete.files.length}ファイル, ${filesToDelete.dirs.length}ディレクトリ`,
      );
    }
  }

  if (!onlyDb) {
    logSection("コード参照検出");
    codeRefs = detectCodeRefs(featureId);

    if (codeRefs.length === 0) {
      logItem("success", "コード参照はありません");
    } else {
      logItem("warning", `${codeRefs.length}件のコード参照があります`);
      codeRefs.slice(0, 5).forEach((ref) => {
        const [file, ...rest] = ref.split(":");
        console.log(`     ${file}: ${rest.join(":").substring(0, 50)}`);
      });
      if (codeRefs.length > 5) {
        console.log(`     ... 他 ${codeRefs.length - 5} 件`);
      }
    }
  }

  if (!onlyFiles) {
    logSection("DBデータ検出");
    dbData = await detectDbData(featureId);

    if (dbData.featurePrompts.length === 0 && dbData.systemPrompts.length === 0) {
      logItem("success", "DBデータはありません");
    } else {
      logItem("warning", `${dbData.featurePrompts.length}件のFeaturePrompt`);
      logItem("warning", `${dbData.systemPrompts.length}件のSystemPrompt`);
    }
  }

  if (dryRun) {
    console.log("\n=== DRY RUN完了 ===");
    console.log("実際に削除する場合は --dry-run フラグを外して実行してください");
    process.exit(0);
  }

  console.log("\n=== 削除実行 ===");

  if (!onlyDb && (filesToDelete.files.length > 0 || filesToDelete.dirs.length > 0)) {
    logSection("ファイル削除");

    for (const file of filesToDelete.files) {
      try {
        runCommand(`rm "${file}"`);
        logItem("success", `${file} を削除しました`);
      } catch (e) {
        logItem("error", `${file} の削除に失敗: ${e.message}`);
      }
    }

    for (const dir of filesToDelete.dirs) {
      try {
        runCommand(`rm -rf "${dir}"`);
        logItem("success", `${dir} を削除しました`);
      } catch (e) {
        logItem("error", `${dir} の削除に失敗: ${e.message}`);
      }
    }
  }

  if (!onlyFiles && (dbData.featurePrompts.length > 0 || dbData.systemPrompts.length > 0)) {
    logSection("DBデータ削除");

    try {
      if (dbData.featurePrompts.length > 0) {
        await supabase.from("feature_prompts").delete().eq("feature_id", featureId);
        logItem("success", `FeaturePrompt: ${dbData.featurePrompts.length}件削除`);
      }

      for (const prompt of dbData.systemPrompts) {
        await supabase.from("system_prompt_versions").delete().eq("prompt_id", prompt.id);
        logItem("success", `SystemPromptVersion (${prompt.key}): 削除`);

        await supabase.from("system_prompts").delete().eq("key", prompt.key);
        logItem("success", `SystemPrompt (${prompt.key}): 削除`);
      }
    } catch (e) {
      logItem("error", `DB削除エラー: ${e.message}`);
    }
  }

  logSection("削除サマリー");
  logItem("info", "ファイル削除完了");
  logItem("info", "DBデータ削除完了");
  logItem("info", `次のステップ: git add . && git commit -m "cleanup: remove ${featureId}"`);
}

main().catch((e) => {
  console.error("エラー:", e);
  process.exit(1);
});
