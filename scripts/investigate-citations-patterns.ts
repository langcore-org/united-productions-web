/**
 * Citations 詳細調査スクリプト
 *
 * 様々なパターンで重複・欠損の有無を調査
 *
 * 使用法:
 *   npx tsx scripts/investigate-citations-patterns.ts
 */

import { createClientLogger } from "@/lib/logger";

const logger = createClientLogger("InvestigateCitations");

import { readFileSync } from "fs";

const envContent = readFileSync(".env.local", "utf-8");
const apiKeyMatch = envContent.match(/XAI_API_KEY=(.+)/);
const API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : process.env.XAI_API_KEY;
const BASE_URL = "https://api.x.ai/v1";

interface XAIStreamEvent {
  type: string;
  item?: {
    id: string;
    type: string;
    status: string;
    name?: string;
    input?: string;
    call_id?: string;
    content?: Array<{
      type: string;
      text?: string;
      annotations?: Array<{
        type: string;
        url?: string;
        title?: string;
      }>;
    }>;
  };
  annotation?: {
    type: string;
    url?: string;
    title?: string;
  };
}

interface TestCase {
  name: string;
  tools: Array<{ type: string }>;
  input: string;
  expectedBehavior?: string;
}

const testCases: TestCase[] = [
  // パターン1: X検索のみ（様々なクエリ）
  {
    name: "X検索-単一キーワード",
    tools: [{ type: "x_search" }],
    input: "AIについて",
    expectedBehavior: "少量のcitations",
  },
  {
    name: "X検索-複合キーワード",
    tools: [{ type: "x_search" }],
    input: "OpenAI GPT-5 リリース 機能 価格",
    expectedBehavior: "多数のcitations",
  },
  {
    name: "X検索-期間指定",
    tools: [{ type: "x_search" }],
    input: "2026年2月のAIニュース",
    expectedBehavior: "期間フィルタ適用",
  },
  {
    name: "X検索-ユーザー指定",
    tools: [{ type: "x_search" }],
    input: "from:elonmusk AI",
    expectedBehavior: "特定ユーザーの投稿",
  },

  // パターン2: Web検索のみ
  {
    name: "Web検索-単一キーワード",
    tools: [{ type: "web_search" }],
    input: "AIとは",
    expectedBehavior: "基本的な検索結果",
  },
  {
    name: "Web検索-技術的トピック",
    tools: [{ type: "web_search" }],
    input: "OpenAI GPT-5 技術仕様 パラメータ数 アーキテクチャ",
    expectedBehavior: "技術ブログ等",
  },

  // パターン3: 両方の検索
  {
    name: "両方検索-時事ネタ",
    tools: [{ type: "web_search" }, { type: "x_search" }],
    input: "今日のAIニュース",
    expectedBehavior: "両方のソース混在",
  },
  {
    name: "両方検索-製品レビュー",
    tools: [{ type: "web_search" }, { type: "x_search" }],
    input: "Claude 4 レビュー 評価",
    expectedBehavior: "Xの感想+Webの記事",
  },

  // パターン4: 短文/長文
  {
    name: "X検索-短文回答",
    tools: [{ type: "x_search" }],
    input: "xAIのCEOは誰？",
    expectedBehavior: "短文、citations少",
  },
  {
    name: "X検索-長文レポート",
    tools: [{ type: "x_search" }],
    input: "AIの歴史と将来性について詳しく解説して",
    expectedBehavior: "長文、citations多",
  },

  // パターン5: citationsが少ない/多い
  {
    name: "Web検索-citations少",
    tools: [{ type: "web_search" }],
    input: "円周率の値",
    expectedBehavior: "citations少ない（定義のみ）",
  },
  {
    name: "Web検索-citations多",
    tools: [{ type: "web_search" }],
    input: "最新のAI技術動向まとめ",
    expectedBehavior: "citations多い",
  },

  // パターン6: 複数ツール呼び出し
  {
    name: "X検索-複数呼び出し",
    tools: [{ type: "x_search" }],
    input: "OpenAIのニュースとGoogleのニュースとAmazonのニュース",
    expectedBehavior: "複数のx_search_call",
  },

  // パターン7: エッジケース
  {
    name: "X検索-存在しないトピック",
    tools: [{ type: "x_search" }],
    input: "xyz123nonexistent",
    expectedBehavior: "citationsゼロ？",
  },
  {
    name: "両方検索-片方のみ結果",
    tools: [{ type: "web_search" }, { type: "x_search" }],
    input: "2010年の出来事（Xでは議論されてない古い話題）",
    expectedBehavior: "Webのみ、citations混在？",
  },
];

async function runTest(testCase: TestCase): Promise<void> {
  console.log("\n" + "=".repeat(80));
  console.log(`テスト: ${testCase.name}`);
  console.log(`クエリ: ${testCase.input}`);
  console.log(`期待: ${testCase.expectedBehavior}`);
  console.log("=".repeat(80));

  if (!API_KEY) {
    console.error("XAI_API_KEY is not set");
    return;
  }

  const requestBody = {
    model: "grok-4-1-fast-reasoning",
    input: [{ role: "user" as const, content: testCase.input }],
    stream: true,
    tools: testCase.tools,
  };

  const response = await fetch(`${BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("API error:", error);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    console.error("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  // 収集データ
  const inlineAnnotations: Array<{ url: string; title?: string; timestamp: number }> = [];
  const messageAnnotations: Array<{ url: string; title?: string }> = [];
  let textLength = 0;
  let toolCallCount = 0;

  const startTime = Date.now();

  try {
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
          const event: XAIStreamEvent = JSON.parse(data);

          switch (event.type) {
            case "response.output_text.annotation.added":
              if (event.annotation?.type === "url_citation" && event.annotation.url) {
                inlineAnnotations.push({
                  url: event.annotation.url,
                  title: event.annotation.title,
                  timestamp: Date.now() - startTime,
                });
              }
              break;

            case "response.output_text.delta":
              if (event.delta) {
                textLength += event.delta.length;
              }
              break;

            case "response.output_item.added":
              if (event.item?.type?.includes("_call")) {
                toolCallCount++;
              }
              break;

            case "response.output_item.done":
              if (event.item?.type === "message" && event.item.content) {
                for (const content of event.item.content) {
                  if (content.type === "output_text" && content.annotations) {
                    for (const annotation of content.annotations) {
                      if (annotation.type === "url_citation" && annotation.url) {
                        messageAnnotations.push({
                          url: annotation.url,
                          title: annotation.title,
                        });
                      }
                    }
                  }
                }
              }
              break;
          }
        } catch {
          // malformed chunk は無視
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // 分析
  const inlineUrls = inlineAnnotations.map((a) => a.url);
  const messageUrls = messageAnnotations.map((a) => a.url);

  // 重複チェック
  const inlineSet = new Set(inlineUrls);
  const messageSet = new Set(messageUrls);

  // inlineにあってmessageにない
  const onlyInInline = inlineUrls.filter((url) => !messageSet.has(url));
  // messageにあってinlineにない
  const onlyInMessage = messageUrls.filter((url) => !inlineSet.has(url));
  // 両方にある
  const inBoth = inlineUrls.filter((url) => messageSet.has(url));

  console.log("\n📊 RESULTS:");
  console.log(`  テキスト長: ${textLength}文字`);
  console.log(`  ツール呼び出し数: ${toolCallCount}`);
  console.log(`  Inline annotations: ${inlineAnnotations.length}件`);
  console.log(`  Message annotations: ${messageAnnotations.length}件`);
  console.log(`  ユニークURL (inline): ${inlineSet.size}件`);
  console.log(`  ユニークURL (message): ${messageSet.size}件`);

  console.log("\n🔍 DETAIL:");
  console.log(`  Inlineのみ: ${onlyInInline.length}件`);
  console.log(`  Messageのみ: ${onlyInMessage.length}件`);
  console.log(`  両方に存在（重複）: ${inBoth.length}件`);

  if (onlyInInline.length > 0) {
    console.log("\n⚠️  欠損リスク！ MessageにないURL:");
    onlyInInline.slice(0, 3).forEach((url) => console.log(`    - ${url}`));
  }

  if (onlyInMessage.length > 0) {
    console.log("\n⚠️  欠損リスク！ InlineにないURL:");
    onlyInMessage.slice(0, 3).forEach((url) => console.log(`    - ${url}`));
  }

  // 結果をファイルに保存
  const fs = await import("fs");
  const outputPath = `/tmp/citations_${testCase.name.replace(/\s+/g, "_")}.json`;
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        testCase: testCase.name,
        query: testCase.input,
        summary: {
          textLength,
          toolCallCount,
          inlineCount: inlineAnnotations.length,
          messageCount: messageAnnotations.length,
          inlineUnique: inlineSet.size,
          messageUnique: messageSet.size,
          onlyInInline: onlyInInline.length,
          onlyInMessage: onlyInMessage.length,
          duplicates: inBoth.length,
        },
        inlineAnnotations,
        messageAnnotations,
        onlyInInline,
        onlyInMessage,
        duplicates: inBoth,
      },
      null,
      2,
    ),
  );
  console.log(`\n📁 Saved: ${outputPath}`);
}

async function main(): Promise<void> {
  console.log("Citations Patterns Investigation");
  console.log(`Total test cases: ${testCases.length}`);
  console.log("Estimated time: ~10-15 minutes");

  for (const testCase of testCases) {
    await runTest(testCase);
    // APIレート制限を避けるために待機
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\n" + "=".repeat(80));
  console.log("All tests completed!");
  console.log("=".repeat(80));
}

main().catch((err) => {
  logger.error("Investigation failed", { error: String(err) });
  process.exit(1);
});
