/**
 * draft.mdの内容を本番DBへ反映（新バージョンとして保存）
 * 最後の試行ファイルに _APPROVED を付ける
 *
 * 使い方: node prompt-tuning/scripts/approve.mjs <PROMPT_KEY> "<変更理由>"
 * 例:    node prompt-tuning/scripts/approve.mjs RESEARCH_CAST "Web検索指示を強化・出力フォーマットを統一"
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();
const key = process.argv[2];
const note = process.argv[3] ?? "";

if (!key) {
  console.error('Usage: node prompt-tuning/scripts/approve.mjs <PROMPT_KEY> "<変更理由>"');
  process.exit(1);
}

async function main() {
  // draft.mdを読み込む
  const draftPath = join(process.cwd(), "prompt-tuning", key, "draft.md");
  let draftContent;
  try {
    draftContent = readFileSync(draftPath, "utf-8");
  } catch {
    console.error(`❌ draft.md が見つかりません: ${draftPath}`);
    console.error(`   先に init-session.mjs を実行してください`);
    process.exit(1);
  }

  // DBからプロンプトを取得
  const prompt = await prisma.systemPrompt.findUnique({ where: { key } });
  if (!prompt) {
    console.error(`❌ プロンプト "${key}" がDBに見つかりません`);
    process.exit(1);
  }

  // 最新バージョンを取得
  const latest = await prisma.systemPromptVersion.findFirst({
    where: { promptId: prompt.id },
    orderBy: { version: "desc" },
  });
  const newVersion = (latest?.version ?? 0) + 1;

  // 新バージョンをDBに作成
  await prisma.systemPromptVersion.create({
    data: {
      promptId: prompt.id,
      version: newVersion,
      content: draftContent,
      changedBy: "prompt-tuning",
      changeNote: note || `prompt-tuningによる更新`,
    },
  });

  // SystemPromptの本番内容を更新
  await prisma.systemPrompt.update({
    where: { id: prompt.id },
    data: {
      content: draftContent,
      currentVersion: newVersion,
      changeNote: note || `prompt-tuningによる更新`,
      changedBy: "prompt-tuning",
    },
  });

  // 最後の試行ファイルに _APPROVED を付ける
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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
