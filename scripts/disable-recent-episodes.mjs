import { readFileSync, writeFileSync } from "node:fs";

// programs-detailed-data.ts
const file1 = readFileSync("lib/knowledge/programs-detailed-data.ts", "utf-8");
const file2 = readFileSync("lib/knowledge/programs-detailed-data-2.ts", "utf-8");

// recentEpisodes: [ ... ] を削除（最小マッチで複数回置換）
function removeRecentEpisodes(content) {
  // recentEpisodes: から始まり、], で終わる部分を削除
  // ネストされた配列にも対応するため、深さを考慮
  const regex = /recentEpisodes:\s*\[[\s\S]*?\n {2}\],?/g;
  return content.replace(
    regex,
    "// recentEpisodes: 誤りが見つかったため一時的に無効化（2026-02-27）\n  // 正確なデータ収集後に再追加予定\n  recentEpisodes: [],",
  );
}

const newFile1 = removeRecentEpisodes(file1);
const newFile2 = removeRecentEpisodes(file2);

writeFileSync("lib/knowledge/programs-detailed-data.ts", newFile1);
writeFileSync("lib/knowledge/programs-detailed-data-2.ts", newFile2);

console.log("recentEpisodesを無効化しました（空配列に置き換え）");
