#!/usr/bin/env node
/**
 * xAI API直接呼び出しでのレイテンシを計測
 *
 * このスクリプトは、xAI APIの応答までの時間を直接計測し、
 * ボトルネックがアプリ側かxAI側かを特定する
 */

const XAI_API_KEY = process.env.XAI_API_KEY;

if (!XAI_API_KEY) {
  console.error("エラー: XAI_API_KEY 環境変数が設定されていません");
  console.error("  export XAI_API_KEY=your_api_key");
  process.exit(1);
}

const TEST_MESSAGE =
  "過去の「マツコの知らない世界」で高視聴率を記録した回の傾向を分析して、成功パターンを表にまとめてください";

async function measureXAILatency() {
  console.log("========================================");
  console.log("xAI API レイテンシ計測");
  console.log("========================================\n");

  console.log("テストメッセージ:");
  console.log(`  "${TEST_MESSAGE.substring(0, 50)}..."\n`);

  const results = {
    withTools: null,
    withoutTools: null,
  };

  // 1. ツールなしの場合
  console.log("--- パターン1: ツールなし ---");
  results.withoutTools = await callXAI({ tools: false });

  // 2. ツールあり（web_search）の場合
  console.log("\n--- パターン2: web_search ツールあり ---");
  results.withTools = await callXAI({ tools: true });

  // サマリー
  console.log("\n========================================");
  console.log("結果サマリー");
  console.log("========================================");

  console.log("\n【ツールなし】");
  console.log(`  応答開始まで(TTFB): ${results.withoutTools.ttfb}ms`);
  console.log(`  最初のコンテンツ:   ${results.withoutTools.firstContent}ms`);
  console.log(`  完了まで:           ${results.withoutTools.total}ms`);

  console.log("\n【web_searchあり】");
  console.log(`  応答開始まで(TTFB): ${results.withTools.ttfb}ms`);
  console.log(`  最初のイベント:     ${results.withTools.firstEvent}ms`);
  console.log(`  ツール呼び出し検出: ${results.withTools.toolCallDetected || "N/A"}ms`);
  console.log(`  最初のコンテンツ:   ${results.withTools.firstContent}ms`);
  console.log(`  完了まで:           ${results.withTools.total}ms`);

  const toolOverhead = results.withTools.firstEvent - results.withoutTools.firstContent;
  console.log("\n【ツール使用時のオーバーヘッド】");
  console.log(`  推定追加時間: ${toolOverhead > 0 ? toolOverhead : "N/A"}ms`);
  console.log("  ※ LLMがツール使用を判断するまでの時間");

  console.log("\n========================================");
}

async function callXAI({ tools }) {
  const startTime = Date.now();
  const timings = {
    ttfb: 0,
    firstEvent: 0,
    firstContent: 0,
    toolCallDetected: null,
    total: 0,
  };

  const body = {
    model: "grok-4-1-fast-reasoning",
    input: [{ role: "user", content: TEST_MESSAGE }],
    stream: true,
    ...(tools && {
      tools: [{ type: "web_search" }],
    }),
  };

  try {
    const response = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    timings.ttfb = Date.now() - startTime;
    console.log(`  接確立+HTTP応答(TTFB): ${timings.ttfb}ms`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let contentBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const now = Date.now();
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const event = JSON.parse(data);

          // 最初のイベント
          if (timings.firstEvent === 0) {
            timings.firstEvent = now - startTime;
            console.log(`  最初のSSEイベント:      ${timings.firstEvent}ms`);
            console.log(`    タイプ: ${event.type}`);
          }

          // ツール呼び出し検出
          if (event.type?.includes("tool") || event.item?.type?.includes("tool")) {
            if (timings.toolCallDetected === null) {
              timings.toolCallDetected = now - startTime;
              console.log(`  ツール呼び出し検出:     ${timings.toolCallDetected}ms`);
              if (event.item?.action?.query) {
                console.log(`    クエリ: ${event.item.action.query}`);
              }
            }
          }

          // コンテンツ受信
          if (event.type === "response.output_text.delta" && event.delta) {
            if (timings.firstContent === 0) {
              timings.firstContent = now - startTime;
              console.log(`  最初のコンテンツ:       ${timings.firstContent}ms`);
            }
            contentBuffer += event.delta;
          }

          // 完了
          if (event.type === "response.completed") {
            timings.total = now - startTime;
            console.log(`  ストリーム完了:         ${timings.total}ms`);
            if (event.response?.usage) {
              console.log(
                `    トークン: ${event.response.usage.input_tokens}入力 / ${event.response.usage.output_tokens}出力`,
              );
            }
          }
        } catch {
          // パースエラー無視
        }
      }
    }

    return timings;
  } catch (error) {
    console.error("  エラー:", error.message);
    return timings;
  }
}

measureXAILatency();
