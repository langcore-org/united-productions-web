/**
 * grok-4-1-fast-reasoning の cost_in_usd_ticks 確認
 */
import { readFileSync } from "node:fs";

const envContent = readFileSync(".env.local", "utf-8");
const API_KEY = envContent.match(/XAI_API_KEY=(.+)/)?.[1].trim();
const BASE_URL = "https://api.x.ai/v1";

async function check(model: string) {
  const res = await fetch(`${BASE_URL}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content: "東京の今日の天気は？" }],
      tools: [{ type: "web_search" }],
    }),
  });
  const data = await res.json();
  console.log(`\n=== ${model} ===`);
  console.log("usage:", JSON.stringify(data.usage, null, 2));
}

check("grok-4-1-fast-reasoning").catch(console.error);
