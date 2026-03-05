/**
 * X検索 Citations 詳細調査スクリプト
 *
 * 目的: response.output_item.done (type: message) に annotations が含まれるか確認
 *
 * 使用法:
 *   npx tsx scripts/investigate-x-citations.ts
 */

import { createClientLogger } from "@/lib/logger";

const logger = createClientLogger("InvestigateXCitations");

// 環境変数を直接読み込み
import { readFileSync } from "node:fs";

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
        start_index?: number;
        end_index?: number;
      }>;
    }>;
  };
  annotation?: {
    type: string;
    url?: string;
    title?: string;
  };
  response?: {
    output: Array<{
      type: string;
      content?: Array<{
        type: string;
        text?: string;
        annotations?: Array<{
          type: string;
          url?: string;
          title?: string;
        }>;
      }>;
    }>;
  };
}

async function investigateXCitations(): Promise<void> {
  if (!API_KEY) {
    logger.error("XAI_API_KEY is not set");
    process.exit(1);
  }

  const testCases = [
    {
      name: "X検索のみ",
      tools: [{ type: "x_search" }],
      input: "OpenAI GPT-5についてXで最新情報を検索して",
    },
    {
      name: "Web検索のみ",
      tools: [{ type: "web_search" }],
      input: "OpenAI GPT-5についてWebで最新情報を検索して",
    },
    {
      name: "X検索 + Web検索",
      tools: [{ type: "x_search" }, { type: "web_search" }],
      input: "OpenAI GPT-5について最新情報を検索して",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`テストケース: ${testCase.name}`);
    console.log("=".repeat(80));

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
      logger.error("API error", { status: response.status, error });
      continue;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      logger.error("No response body");
      continue;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    const capturedEvents: XAIStreamEvent[] = [];

    // 収集用
    const xSearchAnnotations: Array<{ url?: string; title?: string }> = [];
    const webSearchAnnotations: Array<{ url?: string; title?: string }> = [];
    const messageAnnotationsFromDone: Array<{ url?: string; title?: string }> = [];
    const messageAnnotationsFromCompleted: Array<{ url?: string; title?: string }> = [];

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
            capturedEvents.push(event);

            // イベントタイプ別の処理
            switch (event.type) {
              case "response.output_text.annotation.added":
                if (event.annotation?.type === "url_citation") {
                  console.log("\n📍 [Inline Annotation Added]");
                  console.log(JSON.stringify(event.annotation, null, 2));
                }
                break;

              case "response.output_item.done":
                if (event.item) {
                  console.log(`\n✅ [output_item.done] type: ${event.item.type}`);

                  // X検索の詳細
                  if (event.item.type === "custom_tool_call" && event.item.name?.includes("x_")) {
                    console.log("X Search Input:", event.item.input);
                  }

                  // messageタイプの場合、annotationsを確認
                  if (event.item.type === "message" && event.item.content) {
                    console.log("\n📄 [Message Content Detected]");
                    for (const content of event.item.content) {
                      if (content.type === "output_text") {
                        console.log("Text length:", content.text?.length ?? 0);

                        if (content.annotations && content.annotations.length > 0) {
                          console.log(
                            `\n🎯 ANNOTATIONS FOUND: ${content.annotations.length} items`,
                          );
                          console.log(JSON.stringify(content.annotations, null, 2));
                          messageAnnotationsFromDone.push(...content.annotations);

                          // X検索由来かWeb検索由来かを判断
                          for (const ann of content.annotations) {
                            if (ann.url?.includes("x.com") || ann.url?.includes("twitter.com")) {
                              xSearchAnnotations.push(ann);
                            } else {
                              webSearchAnnotations.push(ann);
                            }
                          }
                        } else {
                          console.log("No annotations in this content");
                        }
                      }
                    }
                  }
                }
                break;

              case "response.completed":
                console.log("\n🏁 [Response Completed]");
                if (event.response?.output) {
                  for (const item of event.response.output) {
                    if (item.type === "message" && item.content) {
                      for (const content of item.content) {
                        if (content.annotations && content.annotations.length > 0) {
                          console.log(
                            `\n📊 Final output annotations: ${content.annotations.length} items`,
                          );
                          messageAnnotationsFromCompleted.push(...content.annotations);
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

    // 結果サマリー
    console.log(`\n${"-".repeat(80)}`);
    console.log("📈 RESULT SUMMARY");
    console.log("-".repeat(80));
    console.log(`Total events captured: ${capturedEvents.length}`);
    console.log(
      `\nAnnotations from output_item.done (message): ${messageAnnotationsFromDone.length}`,
    );
    console.log(`Annotations from response.completed: ${messageAnnotationsFromCompleted.length}`);
    console.log(`\nX Search annotations (x.com/twitter.com): ${xSearchAnnotations.length}`);
    console.log(`Web Search annotations (others): ${webSearchAnnotations.length}`);

    if (xSearchAnnotations.length > 0) {
      console.log("\n🎉 X検索のcitations取得成功！");
      console.log("Sample X citations:");
      xSearchAnnotations.slice(0, 3).forEach((ann, i) => {
        console.log(`  ${i + 1}. ${ann.url}`);
      });
    } else {
      console.log("\n⚠️ X検索のcitationsは検出されませんでした");
    }

    // 結果をファイルに保存
    const fs = await import("node:fs");
    const outputPath = `/tmp/x_citations_${testCase.name.replace(/\s+/g, "_")}.json`;
    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          testCase: testCase.name,
          summary: {
            totalEvents: capturedEvents.length,
            messageAnnotationsFromDone: messageAnnotationsFromDone.length,
            messageAnnotationsFromCompleted: messageAnnotationsFromCompleted.length,
            xSearchAnnotations: xSearchAnnotations.length,
            webSearchAnnotations: webSearchAnnotations.length,
          },
          annotations: {
            fromDone: messageAnnotationsFromDone,
            fromCompleted: messageAnnotationsFromCompleted,
          },
          events: capturedEvents,
        },
        null,
        2,
      ),
    );
    console.log(`\n📁 Full data saved to: ${outputPath}`);
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log("調査完了");
  console.log("=".repeat(80));
}

investigateXCitations().catch((err) => {
  logger.error("Investigation failed", { error: String(err) });
  process.exit(1);
});
