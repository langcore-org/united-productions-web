/**
 * 思考プロセス削除を新しいバージョンとして適用
 */

import { createPromptVersion } from "@/lib/prompts/db/versions";
import { AGENTIC_BASE_PROMPT } from "@/lib/prompts/constants/base";

async function main() {
  console.log("Applying prompt change...\n");

  try {
    const version = await createPromptVersion("GENERAL_CHAT", {
      content: AGENTIC_BASE_PROMPT,
      changeNote: "思考プロセス出力を削除",
      changedBy: "system",
    });

    console.log("✅ Success!");
    console.log(`   Version: ${version.version}`);
    console.log(`   Change note: ${version.changeNote}`);
    console.log(`   Created at: ${version.createdAt}`);
  } catch (error) {
    console.error("❌ Failed:", error);
    process.exit(1);
  }
}

main();
