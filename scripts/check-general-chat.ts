import { getLatestPrompt, getPromptVersions } from "@/lib/prompts/db/versions";

async function main() {
  console.log("=== GENERAL_CHAT 確認 ===\n");

  const latest = await getLatestPrompt("GENERAL_CHAT");
  console.log("最新バージョン:", latest?.version);
  console.log("内容プレビュー:");
  console.log(`${latest?.content?.substring(0, 300)}...\n`);

  const versions = await getPromptVersions("GENERAL_CHAT");
  console.log("バージョン履歴:");
  versions.forEach((v) => {
    console.log(`  v${v.version}: ${v.change_note}`);
  });
}

main();
