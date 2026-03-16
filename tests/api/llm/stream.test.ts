/**
 * LLM Stream API Route テスト
 *
 * システムプロンプトと文脈の要約の統合処理を包括的にテスト
 *
 * @created 2026-02-25
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMMessage } from "@/lib/llm/types";

// =============================================================================
// 統合ロジック（stream/route.ts から抽出）
// =============================================================================

function integrateSummaryIntoSystemPrompt(
  baseSystemPrompt: string,
  messages: LLMMessage[],
): { systemPrompt: string; messagesWithSystem: LLMMessage[] } {
  // ClientMemoryからの要約メッセージを検出・統合
  const summaryPrefix = "これまでの会話の要約";
  const summaryMessage = messages.find(
    (m) => m.role === "system" && m.content.startsWith(summaryPrefix),
  );

  // 基本プロンプトと要約を統合（要約がある場合のみ）
  const systemPrompt = summaryMessage
    ? `${baseSystemPrompt}\n\n---\n\n${summaryMessage.content}`
    : baseSystemPrompt;

  // 最終的なメッセージ配列（ClientMemoryの要約メッセージは除外済み）
  const messagesWithSystem: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages.filter((m) => m.role !== "system"),
  ];

  return { systemPrompt, messagesWithSystem };
}

// =============================================================================
// モックデータ
// =============================================================================

const MOCK_BASE_PROMPT = `## United Productions

## 機能固有の指示

## 出演者リサーチ
あなたは出演者リサーチ専門家です。`;

const MOCK_SUMMARY = `これまでの会話の要約：
- ユーザーはバラエティ番組について質問
- 出演者リサーチの方法を確認`;

// =============================================================================
// テスト: 統合ロジックの基本動作
// =============================================================================

describe("統合ロジックの基本動作", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("要約なしの場合", () => {
    it("基本システムプロンプトのみを返す", () => {
      const messages: LLMMessage[] = [
        { role: "user", content: "こんにちは" },
        { role: "assistant", content: "こんにちは！" },
      ];

      const { systemPrompt, messagesWithSystem } = integrateSummaryIntoSystemPrompt(
        MOCK_BASE_PROMPT,
        messages,
      );

      expect(systemPrompt).toBe(MOCK_BASE_PROMPT);
      expect(systemPrompt).not.toContain("これまでの会話の要約");
      expect(messagesWithSystem).toHaveLength(3);
      expect(messagesWithSystem[0].role).toBe("system");
    });

    it("user/assistantメッセージをそのまま保持", () => {
      const messages: LLMMessage[] = [
        { role: "user", content: "質問1" },
        { role: "assistant", content: "回答1" },
        { role: "user", content: "質問2" },
      ];

      const { messagesWithSystem } = integrateSummaryIntoSystemPrompt(MOCK_BASE_PROMPT, messages);

      expect(messagesWithSystem).toHaveLength(4);
      expect(messagesWithSystem[1].content).toBe("質問1");
      expect(messagesWithSystem[2].content).toBe("回答1");
      expect(messagesWithSystem[3].content).toBe("質問2");
    });
  });

  describe("要約ありの場合", () => {
    it("要約をシステムプロンプトに統合する", () => {
      const messages: LLMMessage[] = [
        { role: "system", content: MOCK_SUMMARY },
        { role: "user", content: "最近の質問" },
      ];

      const { systemPrompt } = integrateSummaryIntoSystemPrompt(MOCK_BASE_PROMPT, messages);

      expect(systemPrompt).toContain(MOCK_BASE_PROMPT);
      expect(systemPrompt).toContain("---");
      expect(systemPrompt).toContain(MOCK_SUMMARY);
    });

    it("要約メッセージは除外され、systemメッセージは1つだけ", () => {
      const messages: LLMMessage[] = [
        { role: "system", content: MOCK_SUMMARY },
        { role: "user", content: "質問" },
        { role: "assistant", content: "回答" },
      ];

      const { messagesWithSystem } = integrateSummaryIntoSystemPrompt(MOCK_BASE_PROMPT, messages);

      expect(messagesWithSystem).toHaveLength(3);
      expect(messagesWithSystem.filter((m) => m.role === "system")).toHaveLength(1);
    });

    it("正しい順序で統合される", () => {
      const messages: LLMMessage[] = [
        { role: "system", content: MOCK_SUMMARY },
        { role: "user", content: "テスト" },
      ];

      const { systemPrompt } = integrateSummaryIntoSystemPrompt(MOCK_BASE_PROMPT, messages);

      const baseEndIndex = systemPrompt.indexOf(MOCK_BASE_PROMPT) + MOCK_BASE_PROMPT.length;
      const separatorIndex = systemPrompt.indexOf("\n\n---\n\n");
      const summaryIndex = systemPrompt.indexOf(MOCK_SUMMARY);

      expect(separatorIndex).toBe(baseEndIndex);
      expect(summaryIndex).toBe(separatorIndex + "\n\n---\n\n".length);
    });
  });
});

// =============================================================================
// テスト: 実使用シナリオ
// =============================================================================

describe("実使用シナリオ", () => {
  it("シナリオA: 新規会話（要約なし）", () => {
    // フロントエンドからの初回リクエスト
    const messages: LLMMessage[] = [
      { role: "user", content: "バラエティ企画に合う若手俳優を探して" },
    ];

    const { systemPrompt, messagesWithSystem } = integrateSummaryIntoSystemPrompt(
      MOCK_BASE_PROMPT,
      messages,
    );

    // 検証
    expect(systemPrompt).toBe(MOCK_BASE_PROMPT);
    expect(systemPrompt).not.toContain("これまでの会話の要約");
    expect(messagesWithSystem).toHaveLength(2);
    expect(messagesWithSystem[0].role).toBe("system");
    expect(messagesWithSystem[1].role).toBe("user");
  });

  it("シナリオB: 継続会話（要約あり）", () => {
    // ClientMemoryが要約を生成した後のリクエスト
    const summary = `これまでの会話の要約：
- ユーザーは「しくじり先生」に出演する若手俳優を探している
- 20代後半〜30代前半の男性俳優を希望
- お笑い要素があり、失敗談を笑いに変えられるタイプを求めている`;

    const messages: LLMMessage[] = [
      { role: "system", content: summary },
      { role: "user", content: "具体的な名前を3人挙げて" },
      {
        role: "assistant",
        content: "候補として、山田孝之さん、菅田将暉さん、横浜流星さんが考えられます。",
      },
      { role: "user", content: "彼らの出演実績は？" },
    ];

    const { systemPrompt, messagesWithSystem } = integrateSummaryIntoSystemPrompt(
      MOCK_BASE_PROMPT,
      messages,
    );

    // 検証
    expect(systemPrompt).toContain(MOCK_BASE_PROMPT);
    expect(systemPrompt).toContain("これまでの会話の要約");
    expect(systemPrompt).toContain("20代後半〜30代前半の男性俳優");
    expect(systemPrompt).toContain("お笑い要素があり");

    expect(messagesWithSystem).toHaveLength(4);
    expect(messagesWithSystem.filter((m) => m.role === "system")).toHaveLength(1);
  });

  it("シナリオC: 長時間会話（累積要約）", () => {
    const accumulatedSummary = `これまでの会話の要約：
- ユーザーは新番組「若手芸人の挑戦」の企画を相談
- ターゲット層は20代女性
- 出演者は若手お笑い芸人5組を予定
- ロケ地は東京近郊の大学キャンパス
- 収録形式はロケ7:スタジオ3の比率
- 予算規模は1回あたり300万円程度
- スポンサーは化粧品メーカーを検討中
- 放送時間は深夜帯（24:00〜25:00）を想定`;

    const messages: LLMMessage[] = [
      { role: "system", content: accumulatedSummary },
      { role: "user", content: "スポンサー提案の資料を作成して" },
    ];

    const { systemPrompt } = integrateSummaryIntoSystemPrompt(MOCK_BASE_PROMPT, messages);

    expect(systemPrompt).toContain("若手芸人の挑戦");
    expect(systemPrompt).toContain("予算規模は1回あたり300万円程度");
    expect(systemPrompt).toContain("放送時間は深夜帯");
  });
});

// =============================================================================
// テスト: エッジケース
// =============================================================================

describe("エッジケース", () => {
  it("空のmessages配列", () => {
    const { systemPrompt, messagesWithSystem } = integrateSummaryIntoSystemPrompt(
      MOCK_BASE_PROMPT,
      [],
    );

    expect(systemPrompt).toBe(MOCK_BASE_PROMPT);
    expect(messagesWithSystem).toHaveLength(1); // systemのみ
  });

  it("空文字の要約", () => {
    const messages: LLMMessage[] = [
      { role: "system", content: "" },
      { role: "user", content: "テスト" },
    ];

    const { systemPrompt } = integrateSummaryIntoSystemPrompt(MOCK_BASE_PROMPT, messages);

    // プレフィックスがないので統合されない
    expect(systemPrompt).toBe(MOCK_BASE_PROMPT);
  });

  it("要約プレフィックスのみ", () => {
    const minimalSummary = "これまでの会話の要約：";
    const messages: LLMMessage[] = [
      { role: "system", content: minimalSummary },
      { role: "user", content: "テスト" },
    ];

    const { systemPrompt } = integrateSummaryIntoSystemPrompt(MOCK_BASE_PROMPT, messages);

    expect(systemPrompt).toContain(minimalSummary);
    expect(systemPrompt.endsWith(minimalSummary)).toBe(true);
  });

  it("特殊文字を含む要約", () => {
    const specialSummary = `これまでの会話の要約：
- 予算: ¥1,000,000
- 日程: 2025/03/15(土) 19:00〜
- 場所: 「スタジオA」
- メモ: <script>alert('test')</script> ← スクリプトタグの話題`;

    const messages: LLMMessage[] = [
      { role: "system", content: specialSummary },
      { role: "user", content: "テスト" },
    ];

    const { systemPrompt } = integrateSummaryIntoSystemPrompt(MOCK_BASE_PROMPT, messages);

    expect(systemPrompt).toContain("¥1,000,000");
    expect(systemPrompt).toContain("2025/03/15(土)");
    expect(systemPrompt).toContain("「スタジオA」");
    expect(systemPrompt).toContain("<script>");
  });

  it("非常に長い会話履歴", () => {
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: `これまでの会話の要約：\n${"- 項目\n".repeat(20)}`,
      },
    ];

    // 100ターン分のメッセージを追加
    for (let i = 0; i < 50; i++) {
      messages.push({ role: "user", content: `質問${i + 1}` });
      messages.push({ role: "assistant", content: `回答${i + 1}` });
    }

    const { messagesWithSystem } = integrateSummaryIntoSystemPrompt(MOCK_BASE_PROMPT, messages);

    expect(messagesWithSystem).toHaveLength(101); // system + 100 messages
    expect(messagesWithSystem[0].role).toBe("system");
  });

  it("要約でないsystemメッセージは無視される", () => {
    const otherSystemContent = "その他のシステム指示";
    const messages: LLMMessage[] = [
      { role: "system", content: otherSystemContent },
      { role: "user", content: "テスト" },
    ];

    const { systemPrompt, messagesWithSystem } = integrateSummaryIntoSystemPrompt(
      MOCK_BASE_PROMPT,
      messages,
    );

    // 統合されない（基本プロンプトのみ）
    expect(systemPrompt).toBe(MOCK_BASE_PROMPT);
    // ただしfilteredMessagesからは除外される
    expect(messagesWithSystem).toHaveLength(2);
  });
});

// =============================================================================
// テスト: レスポンス形式の検証
// =============================================================================

describe("レスポンス形式の検証", () => {
  it("GrokClientに渡されるmessagesの形式", () => {
    const summary = `これまでの会話の要約：
- ユーザーは若手俳優を探している`;

    const messages: LLMMessage[] = [
      { role: "system", content: summary },
      { role: "user", content: "他に誰がいますか？" },
      { role: "assistant", content: "山田太郎さんが候補です。" },
      { role: "user", content: "予算は？" },
    ];

    const { messagesWithSystem } = integrateSummaryIntoSystemPrompt(MOCK_BASE_PROMPT, messages);

    // 構造の検証
    expect(messagesWithSystem).toEqual([
      { role: "system", content: expect.stringContaining("出演者リサーチ") },
      { role: "user", content: "他に誰がいますか？" },
      { role: "assistant", content: "山田太郎さんが候補です。" },
      { role: "user", content: "予算は？" },
    ]);

    // 最初のメッセージにすべての要素が含まれる
    const firstMessage = messagesWithSystem[0];
    expect(firstMessage.content).toContain("United Productions");
    expect(firstMessage.content).toContain("これまでの会話の要約");
  });

  it("JSONシリアライズ可能", () => {
    const messages: LLMMessage[] = [
      { role: "system", content: MOCK_SUMMARY },
      { role: "user", content: "テスト" },
    ];

    const { messagesWithSystem } = integrateSummaryIntoSystemPrompt(MOCK_BASE_PROMPT, messages);

    const serialized = JSON.stringify(messagesWithSystem);
    const deserialized: LLMMessage[] = JSON.parse(serialized);

    expect(deserialized).toEqual(messagesWithSystem);
  });
});
