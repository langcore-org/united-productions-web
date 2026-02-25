/**
 * システムプロンプト構築の動作確認スクリプト
 *
 * 実行: npx ts-node scripts/test-system-prompt.ts
 */

import { buildSystemPrompt } from "@/lib/prompts/system-prompt";

async function test() {
  console.log("=== システムプロンプト構築テスト ===\n");

  // テスト1: 番組情報のみ
  console.log("1. 番組情報のみ（featureIdなし）");
  console.log("----------------------------------------");
  const prompt1 = await buildSystemPrompt("shikujiri");
  console.log("Length:", prompt1.length);
  console.log("Contains 'United Productions':", prompt1.includes("United Productions"));
  console.log("Contains 'しくじり先生':", prompt1.includes("しくじり先生"));
  console.log("Contains '機能固有の指示':", prompt1.includes("機能固有の指示"));
  console.log("\n");

  // テスト2: featureIdあり（DBから取得）
  console.log("2. featureIdあり（research-cast）");
  console.log("----------------------------------------");
  try {
    const prompt2 = await buildSystemPrompt("shikujiri", "research-cast");
    console.log("Length:", prompt2.length);
    console.log("Contains 'United Productions':", prompt2.includes("United Productions"));
    console.log("Contains 'しくじり先生':", prompt2.includes("しくじり先生"));
    console.log("Contains '機能固有の指示':", prompt2.includes("機能固有の指示"));

    // 機能プロンプトの内容も確認
    const hasFeatureContent = prompt2.length > prompt1.length;
    console.log("Feature prompt added:", hasFeatureContent);

    if (hasFeatureContent) {
      console.log("\n--- プロンプトの最後の部分（機能固有の指示）---");
      const lines = prompt2.split("\n");
      const featureStart = lines.findIndex((l) => l.includes("機能固有の指示"));
      if (featureStart >= 0) {
        console.log(lines.slice(featureStart, featureStart + 5).join("\n"));
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
  console.log("\n");

  // テスト3: 全番組
  console.log("3. 全番組（all）");
  console.log("----------------------------------------");
  const prompt3 = await buildSystemPrompt("all");
  console.log("Length:", prompt3.length);
  console.log("Contains 'マツコの知らない世界':", prompt3.includes("マツコの知らない世界"));
  console.log("Contains '13本':", prompt3.includes("13本"));
  console.log("\n");

  console.log("=== テスト完了 ===");
}

test().catch(console.error);
