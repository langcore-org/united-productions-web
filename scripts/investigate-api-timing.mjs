#!/usr/bin/env node
/**
 * API処理時間の内訳を計測するスクリプト
 *
 * 使用方法:
 *   node scripts/investigate-api-timing.mjs
 *
 * 出力:
 *   各処理ステップの所要時間（ミリ秒）
 */

import { performance } from "node:perf_hooks";

// テスト用のメッセージ
const testMessages = [
  { role: "user", content: "過去の「マツコの知らない世界」で高視聴率を記録した回の傾向を分析して" },
];

async function measureAPITiming() {
  console.log("========================================");
  console.log("APIタイミング計測開始");
  console.log("========================================\n");

  const timings = {
    total: 0,
    start: performance.now(),
    dns: 0,
    tcp: 0,
    tls: 0,
    firstByte: 0,
    firstEvent: 0,
    events: [],
  };

  try {
    // APIエンドポイント（開発環境を想定）
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const apiUrl = `${baseUrl}/api/llm/stream`;

    console.log(`接続先: ${apiUrl}\n`);

    const requestBody = {
      messages: testMessages,
      provider: "grok-4-1-fast-reasoning",
      featureId: "research-cast",
      programId: "matsuko",
    };

    console.log("リクエスト送信中...");
    const fetchStart = performance.now();

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const fetchEnd = performance.now();
    timings.dns_tcp_tls = Math.round(fetchEnd - fetchStart);
    console.log(`  → HTTP接確立+リクエスト送信: ${timings.dns_tcp_tls}ms`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log("\nストリーミング受信中...");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventCount = 0;
    let firstEventTime = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const now = performance.now();
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
          eventCount++;

          if (!firstEventTime) {
            firstEventTime = now;
            timings.firstEvent = Math.round(now - fetchStart);
            console.log(`  → 最初のイベント受信: ${timings.firstEvent}ms`);
            console.log(`     イベントタイプ: ${event.type}`);
            if (event.name) console.log(`     ツール名: ${event.name}`);
          }

          timings.events.push({
            time: Math.round(now - fetchStart),
            type: event.type,
            ...(event.name && { name: event.name }),
            ...(event.delta && { delta: event.delta.substring(0, 50) + "..." }),
          });

          // 主要イベントのみ表示
          if (["start", "tool_call", "content"].includes(event.type)) {
            console.log(
              `  [${Math.round(now - fetchStart)
                .toString()
                .padStart(4)}ms] ${event.type}`,
            );
          }

          if (event.type === "done") {
            timings.total = Math.round(now - fetchStart);
            console.log(`\n  → 完了イベント: ${timings.total}ms`);
            if (event.usage) {
              console.log(
                `     トークン: ${event.usage.inputTokens}入力 / ${event.usage.outputTokens}出力`,
              );
            }
          }
        } catch {
          // パースエラーは無視
        }
      }
    }

    console.log("\n========================================");
    console.log("タイミングサマリー");
    console.log("========================================");
    console.log(`接確立〜リクエスト送信: ${timings.dns_tcp_tls}ms`);
    console.log(`最初のイベントまで:     ${timings.firstEvent}ms`);
    console.log(`  └─ サーバー処理時間:  ${timings.firstEvent - timings.dns_tcp_tls}ms`);
    console.log(`総処理時間:             ${timings.total}ms`);
    console.log(`受信イベント数:         ${eventCount}件`);
    console.log("========================================");

    // 詳細イベントログ（オプション）
    if (process.env.VERBOSE) {
      console.log("\n詳細イベントログ:");
      timings.events.forEach((e) => {
        console.log(`  [${e.time.toString().padStart(4)}ms] ${e.type}`);
      });
    }
  } catch (error) {
    console.error("\nエラーが発生しました:", error.message);
    process.exit(1);
  }
}

measureAPITiming();
