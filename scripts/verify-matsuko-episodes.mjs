#!/usr/bin/env node
/**
 * マツコの知らない世界 - 放送回データ確認スクリプト
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const envContent = readFileSync(join(rootDir, ".env.local"), "utf-8");
const apiKey = envContent.match(/XAI_API_KEY=(.+)/)?.[1]?.trim();

const BASE_URL = "https://api.x.ai/v1";

async function verifyEpisodes() {
  const query = `マツコの知らない世界 TBS 2026年1月の放送回を教えてください。

特に以下の日付の放送内容を確認してください：
- 2026年1月3日（土）新春SP
- 2026年1月13日（火）
- 2026年2月3日（火）

各回のテーマ名とゲストを教えてください。
公式サイト https://www.tbs.co.jp/matsuko-sekai/archive/2026.html の情報を参照してください。`;

  const requestBody = {
    model: "grok-4-1-fast-reasoning",
    input: [
      {
        role: "user",
        content: query,
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
      throw new Error(`API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

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
        } catch (e) {}
      }
    }

    console.log("\n\n--- 完了 ---");
    return fullText;
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

verifyEpisodes();
