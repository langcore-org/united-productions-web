#!/usr/bin/env node
/**
 * 放送回データ検証スクリプト（残り8番組）
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const envContent = readFileSync(join(rootDir, ".env.local"), "utf-8");
const apiKey = envContent.match(/XAI_API_KEY=(.+)/)?.[1]?.trim();

if (!apiKey) {
  console.error("XAI_API_KEY not found");
  process.exit(1);
}

const BASE_URL = "https://api.x.ai/v1";

const programs = [
  {
    name: "千鳥の鬼レンチャン",
    station: "日本テレビ",
    timeSlot: "火曜19:00",
    episodes: [
      { date: "2025-02-05", title: "クレイジーケンバンド横山剣・山田孝之" },
      { date: "2025-02-12", title: "狩野英孝・岡田結実・中島颯太" },
      { date: "2025-02-19", title: "水谷千重子・DAIGO・高橋光臣" },
      { date: "2025-02-26", title: "JOY・黒沢かずこ・佐藤栞里" },
      { date: "2025-03-05", title: "滝沢カレン・ギャル曽根・ミチ" },
    ],
  },
  {
    name: "熱狂マニアさん！",
    station: "日本テレビ",
    timeSlot: "水曜19:00",
    episodes: [
      { date: "2025-01-05", title: "最強ホームセンター用品マニア" },
      { date: "2025-01-19", title: "超絶技巧手品マニア" },
      { date: "2025-02-09", title: "鉄道車両マニア" },
      { date: "2025-02-23", title: "カプセルトイマニア" },
      { date: "2025-03-16", title: "昭和レトロ家電マニア" },
    ],
  },
  {
    name: "林修の今知りたいでしょ！",
    station: "テレビ朝日",
    timeSlot: "月曜21:00",
    episodes: [
      { date: "2026-02-19", title: "昭和の常識と令和の新常識 テストで学ぶ「これが今でしょ！」2時間SP" },
      { date: "2026-01-29", title: '最新ゴールド検定SP〜なぜ今"金"がスゴいのか？' },
      { date: "2026-01-08", title: "今こそ食べて欲しい みかんVSりんご 冬に気になる4大症状に…健康パワー対決SP" },
      { date: "2025-11-20", title: "コーヒーVS紅茶！名医が教える最強の飲み方 2時間SP" },
      { date: "2025-10-16", title: "令和のたまごパワー最前線を探れ！『たまご』緊急取調SP 2025" },
    ],
  },
  {
    name: "THE神業チャレンジ",
    station: "日本テレビ",
    timeSlot: "水曜19:00",
    episodes: [
      { date: "2026-01-04", title: "新春スペシャル！神業アーチェリー＆神業サッカー" },
      { date: "2025-11-25", title: "神超えチャレンジ〜くら寿司編＆神業バドミントン" },
      { date: "2025-11-11", title: "神業カーリング＆神業ドライブ" },
      { date: "2025-10-02", title: "目隠し太鼓の達人が神業挑戦＆鈴木福・神業ベース" },
      { date: "2025-10-21", title: "ハンマー投げの神業＆神業フライディングディスク" },
    ],
  },
  {
    name: "ニカゲーム",
    station: "テレビ東京",
    timeSlot: "土曜23:30",
    episodes: [
      { date: "2026-02-25", title: "折り紙デスゲーム パート2" },
      { date: "2026-02-18", title: "新企画！『野球拳』を考案した男の半生に密着！" },
      { date: "2026-02-11", title: "四字熟語トーナメント パート2" },
      { date: "2026-02-04", title: "絶景ポケモンサーフィン対決" },
      { date: "2026-01-28", title: "新企画！ニッポンの喫茶店を変えた男の半生に密着！" },
    ],
  },
  {
    name: "まいにち大喜利",
    station: "YouTube",
    timeSlot: "平日21:00",
    episodes: [
      { date: "2026-02-24", title: "【華大どんたく】モグライダー芝のご褒美ロケ、うなばら道中記" },
      { date: "2026-02-23", title: "【三遊亭好楽】千鳥ノブが大喜利に挑戦" },
      { date: "2026-02-20", title: "【超豪華SP】とろサーモン久保田、マヂラブ野田、ハナコ秋山らが大集合！" },
      { date: "2026-02-19", title: "【華大どんたく】かまいたち濱家、三四郎小宮と大喜利バトル" },
      { date: "2026-02-18", title: "【三遊亭好楽】春風亭昇太と古典落語の世界" },
    ],
  },
  {
    name: "まいにち賞レース",
    station: "YouTube",
    timeSlot: "平日20:00",
    episodes: [
      { date: "2026-02-24", title: "アルコ＆ピースが最新漫才を披露！" },
      { date: "2026-02-23", title: "サツマカワRPG×陣内智則のコラボ漫才" },
      { date: "2026-02-20", title: "霜降り明星が新作コントを初披露" },
      { date: "2026-02-19", title: "ミルクボーイ×カベポスターの珍コラボ" },
      { date: "2026-02-18", title: "和牛が新しい漫才ネタを披露" },
    ],
  },
  {
    name: "偏愛博物館",
    station: "BS朝日",
    timeSlot: "金曜23:00",
    episodes: [
      { date: "2026-02-28", title: "味噌汁博物館＆納豆博物館" },
      { date: "2026-01-31", title: "踏切博物館＆ハト博物館" },
      { date: "2025-11-22", title: "箸博物館＆七味博物館" },
      { date: "2025-10-25", title: "便所博物館＆トイレミュージアム" },
      { date: "2025-08-26", title: "電柱博物館＆畳博物館" },
    ],
  },
];

async function verifyWithXAI(program) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`番組: ${program.name}`);
  console.log(`${"=".repeat(60)}`);

  const requestBody = {
    model: "grok-4-1-fast-reasoning",
    input: [
      {
        role: "user",
        content: `「${program.name}」（${program.station}）の直近5回分の放送回を調査してください。

【確認対象の放送回】
${program.episodes.map((e, i) => `${i + 1}. ${e.date} - ${e.title}`).join("\n")}

以下の観点で調査し、簡潔に回答してください：
1. 正確な放送日（上記の日付が正しいか）
2. 正確なタイトル（上記のタイトルが正しいか）
3. 間違いや不明点があれば指摘

現在の日付は2026年2月27日です。`,
      },
    ],
    stream: true,
    tools: [{ type: "web_search" }],
  };

  try {
    const response = await fetch(`${BASE_URL}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") break;

        try {
          const event = JSON.parse(data);
          if (event.delta) {
            fullText += event.delta;
            process.stdout.write(event.delta);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    console.log("\n");
    return { program: program.name, result: fullText };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return { program: program.name, error: error.message };
  }
}

async function main() {
  console.log("放送回データ検証（残り8番組）を開始します...");
  console.log(`検証対象: ${programs.length}番組`);

  for (const program of programs) {
    await verifyWithXAI(program);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log("\n" + "=".repeat(60));
  console.log("検証完了");
  console.log("=".repeat(60));
}

main().catch(console.error);
