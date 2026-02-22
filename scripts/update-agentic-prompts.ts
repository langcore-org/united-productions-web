/**
 * エージェンティックプロンプト更新スクリプト
 * 
 * Phase 1: エージェント基本プロンプトをDBに追加
 * 既存プロンプトをエージェンティック版に更新
 */

import { prisma } from "@/lib/prisma";
import { DEFAULT_PROMPTS, AGENTIC_BASE_PROMPT, PROMPT_KEYS } from "@/lib/prompts";

async function updateAgenticPrompts() {
  console.log("=== エージェンティックプロンプト更新開始 ===\n");

  // 1. AGENTIC_BASE プロンプトを追加
  console.log("1. AGENTIC_BASE プロンプトを追加...");
  const existingBase = await prisma.systemPrompt.findUnique({
    where: { key: PROMPT_KEYS.AGENTIC_BASE },
  });

  if (!existingBase) {
    const created = await prisma.systemPrompt.create({
      data: {
        id: "prompt_agentic_base",
        key: PROMPT_KEYS.AGENTIC_BASE,
        name: "エージェント基本プロンプト",
        description: "全機能共通のエージェント的振る舞いを定義",
        content: AGENTIC_BASE_PROMPT,
        category: "general",
        isActive: true,
        currentVersion: 1,
        changeNote: "エージェンティック対応として追加",
      },
    });

    await prisma.systemPromptVersion.create({
      data: {
        promptId: created.id,
        version: 1,
        content: AGENTIC_BASE_PROMPT,
        changeNote: "エージェンティック対応として追加",
      },
    });

    console.log("   ✓ AGENTIC_BASE プロンプトを追加しました");
  } else {
    console.log("   → AGENTIC_BASE プロンプトは既に存在します");
  }

  // 2. 既存プロンプトをエージェンティック版に更新
  console.log("\n2. 既存プロンプトをエージェンティック版に更新...");

  const promptsToUpdate = [
    { key: PROMPT_KEYS.GENERAL_CHAT, name: "一般チャット" },
    { key: PROMPT_KEYS.MINUTES, name: "議事録作成" },
    { key: PROMPT_KEYS.MEETING_FORMAT_MEETING, name: "議事録整形（会議用）" },
    { key: PROMPT_KEYS.MEETING_FORMAT_INTERVIEW, name: "議事録整形（面談用）" },
    { key: PROMPT_KEYS.TRANSCRIPT, name: "NA原稿作成" },
    { key: PROMPT_KEYS.TRANSCRIPT_FORMAT, name: "NA原稿整形" },
    { key: PROMPT_KEYS.RESEARCH_CAST, name: "出演者リサーチ" },
    { key: PROMPT_KEYS.RESEARCH_LOCATION, name: "場所リサーチ" },
    { key: PROMPT_KEYS.RESEARCH_INFO, name: "情報リサーチ" },
    { key: PROMPT_KEYS.RESEARCH_EVIDENCE, name: "エビデンスリサーチ" },
    { key: PROMPT_KEYS.PROPOSAL, name: "新企画立案" },
  ];

  for (const { key, name } of promptsToUpdate) {
    const defaultPrompt = DEFAULT_PROMPTS.find((p) => p.key === key);
    if (!defaultPrompt) {
      console.log(`   ⚠ ${name}: デフォルトプロンプトが見つかりません`);
      continue;
    }

    const existing = await prisma.systemPrompt.findUnique({
      where: { key },
    });

    if (existing) {
      // 既存プロンプトを更新
      const newVersion = existing.currentVersion + 1;

      await prisma.systemPromptVersion.create({
        data: {
          promptId: existing.id,
          version: newVersion,
          content: defaultPrompt.content,
          changeNote: "エージェンティック対応として更新",
        },
      });

      await prisma.systemPrompt.update({
        where: { key },
        data: {
          content: defaultPrompt.content,
          description: defaultPrompt.description,
          currentVersion: newVersion,
          changeNote: "エージェンティック対応として更新",
          updatedAt: new Date(),
        },
      });

      console.log(`   ✓ ${name}: 更新しました (v${newVersion})`);
    } else {
      // 新規作成
      const created = await prisma.systemPrompt.create({
        data: {
          id: defaultPrompt.id,
          key: defaultPrompt.key,
          name: defaultPrompt.name,
          description: defaultPrompt.description,
          content: defaultPrompt.content,
          category: defaultPrompt.category,
          isActive: true,
          currentVersion: 1,
          changeNote: "エージェンティック対応として追加",
        },
      });

      await prisma.systemPromptVersion.create({
        data: {
          promptId: created.id,
          version: 1,
          content: defaultPrompt.content,
          changeNote: "エージェンティック対応として追加",
        },
      });

      console.log(`   ✓ ${name}: 新規作成しました`);
    }
  }

  console.log("\n=== エージェンティックプロンプト更新完了 ===");
}

updateAgenticPrompts()
  .catch((error) => {
    console.error("エラーが発生しました:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
