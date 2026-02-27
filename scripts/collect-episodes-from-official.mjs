#!/usr/bin/env node
/**
 * 放送回データ収集支援スクリプト
 *
 * このスクリプトは、公式サイトから放送回データを収集する際の
 * テンプレートと検証支援を提供します。
 *
 * 使用方法:
 *   node scripts/collect-episodes-from-official.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// 番組リスト（正確な情報）
const programs = [
  {
    id: "matsuko",
    name: "マツコの知らない世界",
    station: "TBS",
    schedule: "火曜 20:55",
    officialUrl: "https://www.tbs.co.jp/matsuko-sekai/",
    archiveUrl: "https://www.tbs.co.jp/matsuko-sekai/archive/2026.html",
  },
  {
    id: "shikujiri",
    name: "しくじり先生 俺みたいになるな!!",
    station: "テレビ朝日",
    schedule: "土曜 18:55",
    officialUrl: "https://www.tv-asahi.co.jp/shikujiri/",
    archiveUrl: "https://www.tv-asahi.co.jp/shikujiri/backnumber/",
  },
  {
    id: "kaneo",
    name: "有吉のお金発見 突撃!カネオくん",
    station: "NHK総合",
    schedule: "水曜 20:00",
    officialUrl: "https://www.nhk.or.jp/tv/pl/series-tep-ZV9LQ94Z3R/",
    archiveUrl: null, // NHKプラスで確認
  },
  {
    id: "achikochi",
    name: "あちこちオードリー",
    station: "テレビ東京",
    schedule: "水曜 21:30",
    officialUrl: "https://www.tv-tokyo.co.jp/achikochi_audrey/",
    archiveUrl: "https://www.tv-tokyo.co.jp/achikochi_audrey/lineup/",
  },
  {
    id: "kamaigachi",
    name: "かまいガチ",
    station: "テレビ朝日",
    schedule: "火曜 23:15",
    officialUrl: "https://www.tv-asahi.co.jp/kamaigachi/",
    archiveUrl: "https://www.tv-asahi.co.jp/kamaigachi/backnumber/",
  },
  {
    id: "onirenchan",
    name: "千鳥の鬼レンチャン",
    station: "フジテレビ",
    schedule: "日曜 19:00",
    officialUrl: "https://www.fujitv.co.jp/oniren/",
    archiveUrl: null,
  },
  {
    id: "maniasan",
    name: "熱狂マニアさん！",
    station: "TBS",
    schedule: "土曜 19:00",
    officialUrl: "https://www.tbs.co.jp/maniasan_tbs/",
    archiveUrl: null,
  },
  {
    id: "hayashiosamu",
    name: "林修の今知りたいでしょ！",
    station: "テレビ朝日",
    schedule: "月曜 21:00",
    officialUrl: "https://www.tv-asahi.co.jp/imadesho/",
    archiveUrl: "https://www.tv-asahi.co.jp/imadesho/review/",
  },
  {
    id: "kamichallenge",
    name: "THE神業チャレンジ",
    station: "TBS",
    schedule: "火曜 19:00",
    officialUrl: "https://www.tbs.co.jp/kamichallenge_tbs/",
    archiveUrl: null,
  },
  {
    id: "nikagame",
    name: "ニカゲーム",
    station: "テレビ朝日",
    schedule: "水曜 深夜",
    officialUrl: "https://www.tv-asahi.co.jp/nikagame/",
    archiveUrl: "https://www.tv-asahi.co.jp/nikagame/backnumber/",
  },
];

/**
 * データ収集テンプレートを生成
 */
function generateTemplate(program) {
  return `# ${program.name} - 放送回データ収集テンプレート

## 番組情報
- **放送局**: ${program.station}
- **放送時間**: ${program.schedule}
- **公式サイト**: ${program.officialUrl}
- **過去回放送**: ${program.archiveUrl || "配信サービスで確認"}

## 収集手順

1. 公式サイトにアクセス
   \`\`\`
   ${program.archiveUrl || program.officialUrl}
   \`\`\`

2. 直近5回分の放送回情報を収集

3. 以下の形式で記録：

\`\`\`typescript
{
  broadcastDate: "YYYY-MM-DD",  // 必須
  title: "公式タイトル",         // 推奨（省略不可）
  content: "内容概要",           // 必須
  guests: ["ゲスト1", "ゲスト2"], // 必須（空配列可）
}
\`\`\`

## 収集データ

| # | 放送日 | タイトル | ゲスト | 検証済 |
|---|-------|---------|--------|-------|
| 1 | | | | ☐ |
| 2 | | | | ☐ |
| 3 | | | | ☐ |
| 4 | | | | ☐ |
| 5 | | | | ☐ |

## 検証記録

- **検証日**: 
- **検証方法**: 
- **検証結果**: 
- **備考**: 

---

**注意**: 公式サイトの表記をそのまま使用すること。勝手に詳細を追加しないこと。
`;
}

/**
 * 全番組のテンプレートを生成
 */
function generateAllTemplates() {
  const outputDir = join(rootDir, "docs", "verification", "collection-templates");

  // ディレクトリがなければ作成
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  for (const program of programs) {
    const template = generateTemplate(program);
    const filename = `${program.id}.md`;
    writeFileSync(join(outputDir, filename), template);
    console.log(`✓ ${filename}`);
  }

  console.log(`\nテンプレートを ${outputDir} に生成しました`);
  console.log("各ファイルにアクセスして、公式サイトからデータを収集してください");
}

/**
 * 検証チェックリストを生成
 */
function generateChecklist() {
  const checklist = `# 放送回データ検証チェックリスト

> **検証日**: 2026-__-__  
> **検証者**: 

## 検証対象

- [ ] マツコの知らない世界（TBS）
- [ ] しくじり先生（テレビ朝日）
- [ ] 有吉のお金発見（NHK総合）
- [ ] あちこちオードリー（テレビ東京）
- [ ] かまいガチ（テレビ朝日）
- [ ] 千鳥の鬼レンチャン（フジテレビ）
- [ ] 熱狂マニアさん！（TBS）
- [ ] 林修の今知りたいでしょ！（テレビ朝日）
- [ ] THE神業チャレンジ（TBS）
- [ ] ニカゲーム（テレビ朝日）

## 検証項目（各番組）

### 基本情報
- [ ] 放送局が正しい
- [ ] 放送時間（曜日・時刻）が正しい
- [ ] 公式サイトURLが正しい

### 放送回データ（直近5回）
- [ ] 放送日が正しい
- [ ] 日付と曜日が一致する
- [ ] タイトルが公式表記と一致する
- [ ] ゲストが正しい
- [ ] 内容概要が実際の放送と一致する

## 検証結果サマリー

| 番組 | 状態 | 備考 |
|-----|------|-----|
| マツコ | ☐ | |
| しくじり | ☐ | |
| カネオ | ☐ | |
| あちこち | ☐ | |
| かまい | ☐ | |
| 鬼レン | ☐ | |
| マニア | ☐ | |
| 林修 | ☐ | |
| 神業 | ☐ | |
| ニカゲ | ☐ | |

## 全体評価

- [ ] 全番組の基本情報が正しい
- [ ] 全放送回の日付が正しい
- [ ] 全タイトルが公式表記と一致する
- [ ] コミット可能

**検証完了日**: ___________
**次回検証予定**: ___________
`;

  const outputPath = join(rootDir, "docs", "verification", "CHECKLIST.md");
  writeFileSync(outputPath, checklist);
  console.log(`✓ 検証チェックリスト: ${outputPath}`);
}

// メイン実行
console.log("放送回データ収集支援ツール\n");
console.log("=".repeat(50));

// テンプレート生成
console.log("\n【Step 1】データ収集テンプレートを生成中...");

const outputDir = join(rootDir, "docs", "verification", "collection-templates");

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

for (const program of programs) {
  const template = generateTemplate(program);
  const filename = `${program.id}.md`;
  writeFileSync(join(outputDir, filename), template);
  console.log(`  ✓ ${filename}`);
}

console.log(`\n  テンプレートを生成しました:`);
console.log(`  ${outputDir}`);

// チェックリスト生成
console.log("\n【Step 2】検証チェックリストを生成中...");
generateChecklist();

console.log("\n" + "=".repeat(50));
console.log("\n次のステップ:");
console.log("1. docs/verification/collection-templates/ を開く");
console.log("2. 各番組のテンプレートに従って公式サイトからデータを収集");
console.log("3. CHECKLIST.md を使用して検証");
console.log("4. 問題なければ programs-detailed-data.ts に追加");
