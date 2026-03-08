# LLM Stream API テスト

## 概要

システムプロンプトと文脈の要約の統合処理をテストします。

## 統合処理の仕組み

```typescript
// stream/route.ts から抽出した統合ロジック
function integrateSummaryIntoSystemPrompt(
  baseSystemPrompt: string,
  messages: LLMMessage[],
): { systemPrompt: string; messagesWithSystem: LLMMessage[] } {
  // ClientMemoryからの要約メッセージを検出
  const summaryPrefix = "これまでの会話の要約";
  const summaryMessage = messages.find(
    (m) => m.role === "system" && m.content.startsWith(summaryPrefix),
  );

  // 基本プロンプトと要約を統合
  const systemPrompt = summaryMessage
    ? `${baseSystemPrompt}\n\n---\n\n${summaryMessage.content}`
    : baseSystemPrompt;

  // 最終的なメッセージ配列
  const messagesWithSystem: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages.filter((m) => m.role !== "system"),
  ];

  return { systemPrompt, messagesWithSystem };
}
```

## テストカテゴリ

### 1. 統合ロジックの基本動作
- 要約なしの場合
- 要約ありの場合
- 正しい統合順序

### 2. 実使用シナリオ
- **シナリオA**: 新規会話（要約なし）
- **シナリオB**: 継続会話（要約あり）
- **シナリオC**: 長時間会話（累積要約）

### 3. エッジケース
- 空のmessages配列
- 空文字の要約
- 特殊文字を含む要約
- 非常に長い会話履歴

### 4. レスポンス形式の検証
- GrokClientに渡されるmessagesの形式
- JSONシリアライズ可能性

## 実行方法

```bash
# すべてのstreamテストを実行
npx vitest run tests/api/llm/stream.test.ts

# ウォッチモード
npx vitest tests/api/llm/stream.test.ts
```

## 統合処理の背景

### 問題
`ClientMemory`（閾値ベースRolling Summary）と`buildSystemPrompt`の両方がsystemメッセージを生成するため、**2つのsystemメッセージが競合**していました。

```
【修正前】
messages: [
  { role: "system", content: "会社概要+番組情報+機能プロンプト" },
  { role: "system", content: "これまでの会話の要約：..." },  ← 競合！
  ...
]
```

### 解決
`stream/route.ts`で要約メッセージを検出し、基本システムプロンプトに統合します。

```
【修正後】
messages: [
  { 
    role: "system", 
    content: "会社概要+番組情報+機能プロンプト\n\n---\n\nこれまでの会話の要約：..."
  },  ← 統合済み1つだけ
  ...
]
```

## テスト結果

すべてのテストがパスしています。

```
✓ 統合ロジックの基本動作
  ✓ 要約なしの場合
    ✓ 基本システムプロンプトのみを返す
    ✓ user/assistantメッセージをそのまま保持
  ✓ 要約ありの場合
    ✓ 要約をシステムプロンプトに統合する
    ✓ 要約メッセージは除外され、systemメッセージは1つだけ
    ✓ 正しい順序で統合される

✓ 実使用シナリオ
  ✓ シナリオA: 新規会話（要約なし）
  ✓ シナリオB: 継続会話（要約あり）
  ✓ シナリオC: 長時間会話（累積要約）

✓ エッジケース
  ✓ 空のmessages配列
  ✓ 空文字の要約
  ✓ 要約プレフィックスのみ
  ✓ 特殊文字を含む要約
  ✓ 非常に長い会話履歴
  ✓ 要約でないsystemメッセージは無視される

✓ レスポンス形式の検証
  ✓ GrokClientに渡されるmessagesの形式
  ✓ JSONシリアライズ可能
```

## 関連ファイル

- `app/api/llm/stream/route.ts` - APIエンドポイント（統合処理の実装）
- `lib/prompts/system-prompt.ts` - システムプロンプト構築
- `lib/llm/memory/client-memory.ts` - クライアントサイドMemory管理
