/**
 * DBから指定キーのプロンプトを取得して表示
 *
 * 使い方: node prompt-tuning/scripts/get.mjs <PROMPT_KEY>
 * 例:    node prompt-tuning/scripts/get.mjs RESEARCH_CAST
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const key = process.argv[2];

if (!key) {
  console.error("Usage: node prompt-tuning/scripts/get.mjs <PROMPT_KEY>");
  process.exit(1);
}

async function main() {
  const prompt = await prisma.systemPrompt.findUnique({
    where: { key },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 3,
        select: { version: true, changeNote: true, createdAt: true },
      },
    },
  });

  if (!prompt) {
    console.error(`❌ プロンプト "${key}" が見つかりません`);
    process.exit(1);
  }

  console.log(`📋 ${prompt.name} (${prompt.key})`);
  console.log(`   バージョン: v${prompt.currentVersion}`);
  console.log(`   カテゴリ: ${prompt.category}`);
  console.log(`\nバージョン履歴 (直近3件):`);
  for (const v of prompt.versions) {
    console.log(`  v${v.version}: ${v.changeNote ?? "-"} (${v.createdAt.toISOString().slice(0, 10)})`);
  }
  console.log(`\n--- プロンプト内容 ---\n`);
  console.log(prompt.content);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
