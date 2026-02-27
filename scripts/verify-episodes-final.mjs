#!/usr/bin/env node
/**
 * 放送回データ検証スクリプト（Responses API版）
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// APIキーを読み込み
const envContent = readFileSync(join(rootDir, ".env.local"), "utf-8");
const apiKey = envContent.match(/XAI_API_KEY=(.+)/)?.[1]?.trim();

if (!apiKey) {
  console.error("XAI_API_KEY not found");
  process.exit(1);
}

const BASE_URL = "https://api.x.ai/v1";

// 検証対象データ（全13番組）
const programs = [
  {
    name: "マツコの知らない世界",
    station: "TBS",
    timeSlot: "火曜20:55",
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
    timeSlot: "土曜18:55",
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
    timeSlot: "水曜20:00",
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
    timeSlot: "水曜21:30",
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
    timeSlot: "火曜23:15",
    episodes: [
      { date: "2025-02-05", title: "MCたかしイケメン化大作戦＆シュウのショッピング同行" },
      { date: "2025-02-12", title: "まゆはメイク道具を失くすな＆シュウのショッピング同行" },
      { date: "2025-02-19", title: "まゆはメイク道具を失くすな＆MCたかしイケメン化大作戦" },
      { date: "2025-02-26", title: "シュウのショッピング同行＆MCたかしイケメン化大作戦" },
      { date: "2025-03-05", title: "まゆはメイク道具を失くすな＆シュウのショッピング同行" },
    ],
  },
];

async function verifyWithXAI(program) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`番組: ${program.name}`);
  console.log(`${"=".repeat(60)}`);

  const query = `${program.name} ${program.station} ${program.timeSlot} 放送回 最新 ${program.episodes.map((e) => e.date.replace(/-/g, "/")).join(" ")}`;

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
  console.log("放送回データ検証を開始します...");
  console.log(`検証対象: ${programs.length}番組`);
  console.log(`現在日付: 2026-02-27`);

  const results = [];
  for (const program of programs) {
    const result = await verifyWithXAI(program);
    results.push(result);
    // APIレート制限対策
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log("\n" + "=".repeat(60));
  console.log("検証完了");
  console.log("=".repeat(60));
}

main().catch(console.error);
