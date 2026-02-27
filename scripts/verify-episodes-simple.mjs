#!/usr/bin/env node
/**
 * 放送回データ検証スクリプト（簡易版）
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

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

const programs = [
  {
    name: "マツコの知らない世界",
    station: "TBS",
    episodes: [
      { date: "2026-02-24", title: "野生ネコの世界" },
      { date: "2026-02-17", title: "味噌の世界" },
      { date: "2026-02-10", title: "踏切の世界" },
      { date: "2026-01-13", title: "お菓子のパッケージの世界" },
      { date: "2026-01-03", title: "新春拡大SP 演歌の世界" },
    ],
  },
];

async function verifyEpisodes(program) {
  console.log(`\n=== ${program.name} ===`);
  
  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-2-latest",
        messages: [
          {
            role: "user",
            content: `「${program.name}」${program.station}の2026年1月〜2月の放送回について教えてください。

特に以下の日付・タイトルが正しいか確認してください：
${program.episodes.map(e => `- ${e.date}: ${e.title}`).join("\n")}

簡潔に回答してください。`
          }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;
    console.log(result);
    
    return { program: program.name, result };
  } catch (error) {
    console.error(`Error:`, error.message);
    return { program: program.name, error: error.message };
  }
}

async function main() {
  for (const program of programs) {
    await verifyEpisodes(program);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

main().catch(console.error);
