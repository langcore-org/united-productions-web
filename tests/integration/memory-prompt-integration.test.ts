/**
 * Memory → 要約 → システムプロンプト生成 統合テスト
 *
 * 実際の使用フローをE2Eで検証
 *
 * @created 2026-02-25
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientMemory } from "@/lib/llm/memory";
import type { LLMMessage } from "@/lib/llm/types";

// 統合処理のロジック（stream/route.tsから抽出）
function integrateSummaryIntoSystemPrompt(
  baseSystemPrompt: string,
  messages: LLMMessage[],
): { systemPrompt: string; messagesWithSystem: LLMMessage[] } {
  const summaryPrefix = "これまでの会話の要約";
  const summaryMessage = messages.find(
    (m) => m.role === "system" && m.content.startsWith(summaryPrefix),
  );

  const systemPrompt = summaryMessage
    ? `${baseSystemPrompt}\n\n---\n\n${summaryMessage.content}`
    : baseSystemPrompt;

  const messagesWithSystem: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages.filter((m) => m.role !== "system"),
  ];

  return { systemPrompt, messagesWithSystem };
}

// モック用の基本システムプロンプト
const MOCK_BASE_PROMPT = `## 機能固有の指示

## 出演者リサーチ
あなたは出演者リサーチ専門家です。`;

describe("Memory → 要約 → システムプロンプト 統合フロー", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("フロー1: 新規会話 → システムプロンプト生成", async () => {
    // 1. ClientMemoryを初期化
    const memory = new ClientMemory("grok-4-1-fast");

    // 2. メッセージを追加（閾値未満なので要約は発生しない）
    await memory.addMessages([
      { role: "user", content: "バラエティ企画に合う若手俳優を探して" },
      { role: "assistant", content: "山田太郎さん、鈴木花子さんが候補です。" },
      { role: "user", content: "彼らの出演実績は？" },
    ]);

    // 3. コンテキストを取得
    const context = memory.getContext();

    // 4. 検証: 要約なし、全メッセージが返る
    expect(context.summary).toBeUndefined();
    expect(context.messages).toHaveLength(3);

    // 5. システムプロンプトと統合
    const { systemPrompt, messagesWithSystem } = integrateSummaryIntoSystemPrompt(
      MOCK_BASE_PROMPT,
      context.messages,
    );

    // 6. 検証
    expect(systemPrompt).toBe(MOCK_BASE_PROMPT);
    expect(systemPrompt).not.toContain("これまでの会話の要約");
    expect(messagesWithSystem).toHaveLength(4); // system + 3 messages
    expect(messagesWithSystem[0].role).toBe("system");
  });

  it("フロー2: 要約あり → システムプロンプト生成", () => {
    // 1. 要約を含むコンテキストをシミュレート
    const summary = `これまでの会話の要約：
- ユーザーは「しくじり先生」に出演する若手俳優を探している
- 20代後半〜30代前半の男性俳優を希望
- お笑い要素があり、失敗談を笑いに変えられるタイプを求めている`;

    const contextMessages: LLMMessage[] = [
      { role: "system", content: summary },
      { role: "user", content: "具体的な名前を3人挙げて" },
      { role: "assistant", content: "山田孝之さん、菅田将暉さん、横浜流星さんが考えられます。" },
      { role: "user", content: "予算はどうなりますか？" },
    ];

    // 2. システムプロンプトと統合
    const { systemPrompt, messagesWithSystem } = integrateSummaryIntoSystemPrompt(
      MOCK_BASE_PROMPT,
      contextMessages,
    );

    // 3. 検証
    expect(systemPrompt).toContain(MOCK_BASE_PROMPT);
    expect(systemPrompt).toContain("---");
    expect(systemPrompt).toContain("これまでの会話の要約");
    expect(systemPrompt).toContain("20代後半〜30代前半の男性俳優");
    expect(systemPrompt).toContain("お笑い要素があり");

    // 4. messagesWithSystemの検証
    expect(messagesWithSystem).toHaveLength(4);
    expect(messagesWithSystem.filter((m) => m.role === "system")).toHaveLength(1);

    // 5. 最終的なLLM送信形式を検証
    const finalMessages = messagesWithSystem;
    expect(finalMessages[0].content).toContain("United Productions");
    expect(finalMessages[0].content).toContain("出演者リサーチ");
    expect(finalMessages[0].content).toContain("これまでの会話の要約");
  });
});
