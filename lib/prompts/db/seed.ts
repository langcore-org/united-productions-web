/**
 * 初期プロンプトデータ投入
 * 
 * @created 2026-02-22 12:30
 */

import { prisma } from "@/lib/prisma";
import { DEFAULT_PROMPTS } from "../constants";

/**
 * 初期プロンプトデータをDBに投入
 * テーブルが空の場合のみ実行
 */
export async function seedPrompts(): Promise<void> {
  try {
    const count = await prisma.systemPrompt.count();
    if (count > 0) {
      console.log("[Prompts] Already seeded, skipping...");
      return;
    }

    console.log("[Prompts] Seeding default prompts...");
    for (const prompt of DEFAULT_PROMPTS) {
      await prisma.systemPrompt.create({
        data: {
          id: prompt.id,
          key: prompt.key,
          name: prompt.name,
          description: prompt.description,
          content: prompt.content,
          category: prompt.category,
          currentVersion: 1,
        },
      });

      // バージョン1の履歴も作成
      const created = await prisma.systemPrompt.findUnique({
        where: { key: prompt.key },
      });

      if (created) {
        await prisma.systemPromptVersion.create({
          data: {
            promptId: created.id,
            version: 1,
            content: prompt.content,
            changedBy: null,
            changeNote: "Initial version",
          },
        });
      }
    }

    console.log(`[Prompts] Seeded ${DEFAULT_PROMPTS.length} prompts`);
  } catch (error) {
    console.error("[Prompts] Failed to seed prompts:", error);
    throw error;
  }
}
