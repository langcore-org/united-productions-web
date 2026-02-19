import { prisma } from "../lib/prisma";

async function main() {
  try {
    const count = await prisma.systemPrompt.count();
    console.log(`SystemPrompt count: ${count}`);
    
    if (count === 0) {
      console.log("No prompts found. Seeding...");
      
      // 初期データを投入
      const prompts = [
        {
          id: "prompt_general_chat",
          key: "GENERAL_CHAT",
          name: "一般チャット",
          description: "汎用チャット用システムプロンプト",
          content: `## AIアシスタント\n\nあなたはテレビ制作業務を支援するAIアシスタントです。`,
          category: "general",
          isActive: true,
        },
        {
          id: "prompt_minutes",
          key: "MINUTES",
          name: "議事録作成",
          description: "Zoom文字起こしから議事録を作成",
          content: `## 議事録作成\n\nあなたはテレビ制作の議事録作成専門家です。`,
          category: "minutes",
          isActive: true,
        },
        {
          id: "prompt_research_cast",
          key: "RESEARCH_CAST",
          name: "出演者リサーチ",
          description: "企画に最適な出演者候補をリサーチ",
          content: `## 出演者リサーチ\n\nあなたはテレビ制作の出演者リサーチ専門家です。`,
          category: "research",
          isActive: true,
        },
      ];
      
      for (const prompt of prompts) {
        await prisma.systemPrompt.create({
          data: {
            ...prompt,
            updatedAt: new Date(),
          },
        });
      }
      
      console.log(`Seeded ${prompts.length} prompts`);
    } else {
      const allPrompts = await prisma.systemPrompt.findMany({
        select: { key: true, name: true, category: true },
      });
      console.log("\nExisting prompts:");
      allPrompts.forEach(p => {
        console.log(`  - ${p.key} (${p.category}): ${p.name}`);
      });
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
