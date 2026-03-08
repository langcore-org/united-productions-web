---
name: llm-application-dev
description: LLMアプリケーション開発。プロンプトエンジニアリング、Few-shot学習、Chain-of-Thoughtによる推論実装をサポート。ユーザーが「プロンプト」「LLM」「AIの応答」などに関する質問や改善要望をした時に使用。
---

# LLM Application Development

LLM（大規模言語モデル）を使ったアプリケーション開発のスキル。プロンプトエンジニアリング、構造化出力、Few-shot学習、Chain-of-Thoughtなどの実装パターンを網羅。

## When to use

- 「プロンプトを改善したい」「AIの応答を調整したい」などの発言時
- LLMを使った機能の新規実装時
- AIの応答品質が悪い・不安定な時
- 「構造化出力」「JSONモード」などの実装時
- Few-shot、Chain-of-Thoughtなどの技法を導入したい時
- ストリーミングレスポンスの実装時

## Core Principles

### プロンプト設計の基本

1. **明確な役割定義** - 「あなたは〜です」と明確に
2. **具体的な出力フォーマット** - 期待する形式を明示
3. **思考プロセスの分離** - 考える過程と最終出力を分ける
4. **制約条件の明確化** - 守るべきルールを列挙

### このプロジェクトのLLM実装

| 項目 | 内容 |
|------|------|
| **プロバイダー** | xAI (Grok) のみ（現在） |
| **実装方式** | xAI直接API呼び出し（LangChain不使用） |
| **エンドポイント** | `/responses` (xAI Responses API) |
| **ストリーミング** | SSE (Server-Sent Events) |

## Implementation Patterns

### Pattern 1: 基本的なプロンプト構造

```typescript
interface SystemPrompt {
  role: string;        // 「あなたは〜です」
  context: string;     // 背景情報
  instructions: string; // 具体的な指示
  constraints: string[]; // 制約条件
  outputFormat: string; // 出力形式
}

// 例: 議事録生成
const minutesPrompt = {
  role: "あなたはプロの議事録作成者です",
  context: "テレビ制作現場の打ち合わせ会議の書き起こしデータを受け取ります",
  instructions: "内容を整理して議事録形式に整形してください",
  constraints: [
    "• 要点を箇条書きで整理",
    "• 決定事項と宿題を明確に分ける",
    "• 時系列で整理"
  ],
  outputFormat: "マークダウン形式"
};
```

### Pattern 2: Few-shot学習

```typescript
interface FewShotExample {
  input: string;
  output: string;
}

const examples: FewShotExample[] = [
  {
    input: "会議内容: A案とB案を比較検討。A案採用決定",
    output: `## 議事録

### 決定事項
- A案を採用

### 経緯
- A案とB案を比較検討
- A案の方がコスト効率が良いと判断`
  }
];

// プロンプトに組み込み
const prompt = `
以下の例のように出力してください：

${examples.map(e => `入力: ${e.input}\n出力: ${e.output}`).join('\n\n')}

---

入力: {userInput}
出力:
`;
```

### Pattern 3: Chain-of-Thought

```typescript
// 思考プロセスを明示的に促す
const cotPrompt = `
質問: {question}

以下の手順で回答してください：

1. まず、問題を理解する
   - 何が問われているか
   - 必要な情報は何か

2. 情報を整理する
   - 関連する事実を列挙
   - 関係性を分析

3. 結論を導き出す
   - 上記の分析に基づいて結論を述べる

4. 最終回答
   [ここに簡潔な回答を記載]

重要: ステップ1-3は「思考プロセス」として出力し、
ステップ4のみがユーザーに見える最終出力です。
`;
```

### Pattern 4: 構造化出力（JSONモード）

```typescript
interface StructuredOutput {
  type: "json_schema";
  schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

// xAI Responses APIでの実装例
const response = await fetch("https://api.x.ai/v1/responses", {
  method: "POST",
  headers: { "Authorization": `Bearer ${apiKey}` },
  body: JSON.stringify({
    model: "grok-2-latest",
    input: prompt,
    text: {
      format: {
        type: "json_schema",
        name: "research_result",
        schema: {
          type: "object",
          properties: {
            candidates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  profile: { type: "string" },
                  reasons: { type: "array", items: { type: "string" } }
                },
                required: ["name", "profile", "reasons"]
              }
            }
          },
          required: ["candidates"]
        }
      }
    }
  })
});
```

## Project-Specific Patterns

### システムプロンプト管理

このプロジェクトでは、システムプロンプトをDBで管理：

```typescript
// lib/prompts/system-prompt.ts
const PROGRAMS = [...]; // 番組情報

// DBから動的にプロンプトを取得
const prompt = await getSystemPrompt("RESEARCH_CAST");
```

### プロンプトチューニングワークフロー

```bash
# 1. チューニングセッション開始
node prompt-tuning/scripts/init-session.mjs <PROMPT_KEY>

# 2. テストケース実行
node prompt-tuning/scripts/save-result.mjs '<JSON>'

# 3. 本番反映
node prompt-tuning/scripts/approve.mjs <PROMPT_KEY> "変更理由"
```

## Best Practices

### DO

- ✅ 明確な役割定義を最初に述べる
- ✅ 具体的な出力例を提示する（Few-shot）
- ✅ 思考プロセスと最終出力を分離する
- ✅ 制約条件を箇条書きで明示する
- ✅ トークン数を意識し、無駄な文言を省く

### DON'T

- ❌ あいまいな指示（「適切に」「良い感じで」など）
- ❌ 思考プロセスを最終出力に含める
- ❌ 一つのプロンプトで複数の異なるタスクを処理
- ❌ 文脈を無視した固定的な応答を期待

## Troubleshooting

| 問題 | 原因 | 解決策 |
|------|------|--------|
| 応答が安定しない | プロンプトが曖昧 | より具体的に、制約を追加 |
| JSONパースエラー | 構造化出力が不安定 | `text.format`でJSONスキーマを明示 |
| 出力が長すぎる | max_tokens未設定 | 適切なmax_tokensを設定 |
| 意図と異なる応答 | Few-shot例が不足 | 例を追加、または例を改善 |

## References

- [xAI API Documentation](https://docs.x.ai/)
- [Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- `docs/specs/api-integration/system-prompt-management.md`
- `prompt-tuning/WORKFLOW.md`
