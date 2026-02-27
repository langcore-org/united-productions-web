#!/usr/bin/env node

/**
 * 放送回データ検証スクリプト
 * xAI APIを使用して各番組の直近5回分の放送回データを検証
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// APIキーを読み込み
const envContent = readFileSync(join(rootDir, ".env.local"), "utf-8");
const apiKey = envContent.match(/XAI_API_KEY=(.+)/)?.[1];

if (!apiKey) {
  console.error("XAI_API_KEY not found");
  process.exit(1);
}

// 検証対象の放送回データ（簡易版 - 実際はファイルから読み込む）
const programs = [
  {
    name: "マツコの知らない世界",
    station: "TBS",
    schedule: "火曜 20:55",
    episodes: [
      { date: "2026-02-24", title: "野生ネコの世界" },
      { date: "2026-02-17", title: "味噌の世界" },
      { date: "2026-02-10", title: "踏切の世界／ご当地喫茶店モーニングの世界" },
      { date: "2026-01-13", title: "お菓子のパッケージの世界" },
      { date: "2026-01-03", title: "新春拡大SP 演歌の世界" },
    ],
  },
  {
    name: "しくじり先生 俺みたいになるな!!",
    station: "テレビ朝日",
    schedule: "土曜 18:55",
    episodes: [
      { date: "2026-01-09", title: "お笑い研究部「エバースの今後を考える」後半戦" },
      { date: "2026-01-02", title: "藤田ニコル 新婚スペシャル" },
      { date: "2025-12-30", title: "今年のしくじり大賞2024" },
      { date: "2025-12-19", title: "お笑い研究部「エバースの今後を考える」前半戦" },
      { date: "2025-12-12", title: "ユージ先生「母親とのしくじりまくり親子関係を激白SP」" },
    ],
  },
  {
    name: "有吉のお金発見 突撃!カネオくん",
    station: "NHK Eテレ",
    schedule: "水曜 20:00",
    episodes: [
      { date: "2026-02-01", title: "特選！お金の達人 2026冬 2時間SP" },
      { date: "2026-01-25", title: "人生が変わる！お金の達人 2時間SP" },
      { date: "2026-01-18", title: "特選！お金の達人 2026冬" },
      { date: "2026-01-11", title: "新年特別編" },
      { date: "2026-01-04", title: "お正月特別編 冬のお金セーブ術" },
    ],
  },
  {
    name: "あちこちオードリー",
    station: "テレビ東京",
    schedule: "水曜 21:30",
    episodes: [
      { date: "2026-02-18", title: "シン・オードリー 若林が子供たちに本気で相談に乗る" },
      { date: "2026-02-11", title: "チョコレートプラネット・カニタンク・エバース" },
      { date: "2026-02-04", title: "シン・オードリー 若林が子供たちに本気で相談に乗る" },
      { date: "2026-01-28", title: "ノブが語る木梨憲武との手紙のやり取り" },
      { date: "2026-01-22", title: "記憶に残った極上のコント" },
    ],
  },
  {
    name: "かまいガチ",
    station: "テレビ朝日",
    schedule: "火曜 23:15",
    episodes: [
      { date: "2025-02-05", title: "MCたかしイケメン化大作戦＆シュウのショッピング同行" },
      { date: "2025-02-12", title: "まゆはメイク道具を失くすな＆シュウのショッピング同行" },
      { date: "2025-02-19", title: "まゆはメイク道具を失くすな＆MCたかしイケメン化大作戦" },
      { date: "2025-02-26", title: "シュウのショッピング同行＆MCたかしイケメン化大作戦" },
      { date: "2025-03-05", title: "まゆはメイク道具を失くすな＆シュウのショッピング同行" },
    ],
  },
];

async function verifyEpisodes(program) {
  console.log(`\n=== ${program.name} ===`);
  console.log(`放送局: ${program.station} / 放送時間: ${program.schedule}`);
  console.log("放送回一覧:");
  program.episodes.forEach((ep, i) => {
    console.log(`  ${i + 1}. ${ep.date} - ${ep.title}`);
  });

  const query = `${program.name} ${program.station} 直近の放送回 2025年 2026年 ${program.episodes.map((e) => e.title).join(" ")}`;

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-2-latest",
        messages: [
          {
            role: "system",
            content:
              "テレビ番組の放送回データを検証するアシスタントです。正確な情報を提供してください。",
          },
          {
            role: "user",
            content: `${program.name}（${program.station}）の直近5回分の放送回について、以下の情報が正しいか確認してください。

【確認する放送回】
${program.episodes.map((ep, i) => `${i + 1}. ${ep.date} - ${ep.title}`).join("\n")}

以下の形式で回答してください：
1. 正しい放送回（日付・タイトルが一致）
2. 修正が必要な放送回（正しい情報を明示）
3. 見つからない放送回
4. 追加すべき放送回

現在の日付は2026年2月27日です。`,
          },
        ],
        tools: [{ type: "web_search" }],
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;
    console.log("\n【検証結果】");
    console.log(result);
    console.log("---");

    return { program: program.name, result };
  } catch (error) {
    console.error(`Error verifying ${program.name}:`, error.message);
    return { program: program.name, error: error.message };
  }
}

async function main() {
  console.log("放送回データ検証を開始します...");
  console.log(`検証対象: ${programs.length}番組`);

  for (const program of programs) {
    await verifyEpisodes(program);
    // APIレート制限を避けるため待機
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log("\n検証完了");
}

main().catch(console.error);
