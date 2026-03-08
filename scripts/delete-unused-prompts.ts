/**
 * 未使用プロンプト削除
 */

import { prisma } from "@/lib/prisma";

const UNUSED_PROMPTS = ["SCHEDULE_ACTOR", "SCHEDULE_STAFF", "SCHEDULE_SYSTEM", "SCHEDULE_VEHICLE"];

async function main() {
  console.log("=== 未使用プロンプト削除 ===\n");

  for (const key of UNUSED_PROMPTS) {
    const prompt = await prisma.systemPrompt.findUnique({
      where: { key },
      include: { versions: true },
    });

    if (!prompt) {
      console.log(`❌ ${key}: 既に存在しません`);
      continue;
    }

    console.log(`🗑️  ${key}: ${prompt.name}`);
    console.log(`   バージョン数: ${prompt.versions.length}`);

    // バージョン履歴を先に削除
    await prisma.systemPromptVersion.deleteMany({
      where: { promptId: prompt.id },
    });

    // プロンプトを削除
    await prisma.systemPrompt.delete({
      where: { id: prompt.id },
    });

    console.log(`   ✅ 削除完了\n`);
  }

  console.log("=== 削除完了 ===");
  await prisma.$disconnect();
}

main();
