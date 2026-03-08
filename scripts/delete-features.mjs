import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const featuresToDelete = ["research-location", "research-info", "na-script"];

async function deleteFeatures() {
  console.log("=== DBデータ削除 ===\n");

  for (const featureId of featuresToDelete) {
    try {
      // FeaturePrompt削除
      const deletedFeaturePrompt = await prisma.featurePrompt.deleteMany({
        where: { featureId },
      });
      console.log(`✅ FeaturePrompt: ${featureId} - ${deletedFeaturePrompt.count}件削除`);
    } catch (error) {
      console.error(`❌ ${featureId} FeaturePrompt削除エラー:`, error.message);
    }
  }

  // SystemPrompt削除
  const keysToDelete = ["RESEARCH_LOCATION", "RESEARCH_INFO", "TRANSCRIPT", "TRANSCRIPT_FORMAT"];

  for (const key of keysToDelete) {
    try {
      // まずSystemPromptを取得
      const prompt = await prisma.systemPrompt.findUnique({
        where: { key },
        include: { versions: true },
      });

      if (prompt) {
        // Versionを削除
        const deletedVersions = await prisma.systemPromptVersion.deleteMany({
          where: { promptId: prompt.id },
        });
        console.log(`✅ SystemPromptVersion: ${key} - ${deletedVersions.count}件削除`);

        // SystemPromptを削除
        await prisma.systemPrompt.delete({
          where: { key },
        });
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

deleteFeatures()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
