# X検索 Citations ワークアラウンド - 包括的調査レポート

> **調査日**: 2026-02-26  
> **調査観点**: xAI API詳細、X API、代替サービス、技術的ワークアラウンド  
> **関連ファイル**: 
> - `docs/specs/api-integration/xai-responses-api-spec.md`
> - `docs/plans/tool-details-display.md`
> - `lib/llm/clients/grok.ts`

---

## エグゼクティブサマリー

### 核心となる発見

**X検索のcitations取得は技術的に可能だが、実装上の課題あり**

従来の調査（`docs/specs/api-integration/xai-responses-api-spec.md`）では「X検索のcitationsは取得不可」と結論付けていたが、**詳細調査の結果、取得は可能であることが判明**しました。

ただし、以下の課題があります：
1. **SDKの互換性問題**: `custom_tool_call` という非標準typeを処理できない
2. **レスポンス構造の複雑さ**: citationsは複数の場所に分散している
3. **プライバシー保護**: 個別ポストの内容は取得可能だが、構造化には工夫が必要

### 推奨アクション

| 優先度 | アクション | 期待効果 |
|--------|-----------|---------|
| P0 | Inline Citations有効化 + レスポンス解析修正 | citations取得可能に |
| P1 | ハイブリッド検索（X + Web）実装 | 精度向上 |
| P2 | キャッシュ機構導入 | コスト削減 |
| P3 | X API直接統合検討 | 完全な制御（高コスト） |

---

## 1. xAI API 詳細調査

### 1.1 公式ドキュメントの再確認

#### Inline Citations仕様

xAI Responses APIでは、**Inline Citationsがデフォルトで有効**です：

```json
{
  "type": "url_citation",
  "url": "https://x.com/i/status/1234567890",
  "start_index": 37,
  "end_index": 76,
  "title": "1"
}
```

**重要な発見**: `include: ["inline_citations"]` はxAI SDK使用時のオプションで、**直接APIを呼び出す場合はデフォルトで有効**です。

#### Tool Call Typesの違い

| Type | 公式ドキュメント | 実際のレスポンス | 用途 |
|------|----------------|----------------|------|
| `web_search_call` | ✅ 記載あり | ✅ 使用される | Web検索ツール |
| `x_search_call` | ✅ 記載あり | ⚠️ 一部のみ | X検索開始時 |
| `custom_tool_call` | ❌ **記載なし** | ✅ 使用される | ツール実行詳細 |

**重大な発見**: `custom_tool_call` は公式ドキュメントに記載がない**内部的なtype**です。

### 1.2 GitHub Issues調査

#### Vercel AI SDK #10607 - 重要

```
問題: X Search使用時に type: "custom_tool_call" が返される
報告者: "I'm pretty sure this was x_search_call until recently."
（最近までこれは x_search_call でした）
```

**推測**: xAI APIの内部実装変更により、X検索のレスポンス形式が変更された可能性があります。

#### OpenClaw #13439, #15417

xAI Responses APIのレスポンス構造について：
- `output_text` はトップレベルではなく `output[N].content[M].text` にネスト
- Citationsは `output[N].content[M].annotations` に含まれる

### 1.3 レスポンス構造の詳細分析

```
【従来の理解（誤り）】
X検索 → citations取得不可

【正しい理解】
X検索 → citations取得可能（ただし構造が複雑）
```

#### 実際のイベントシーケンス

```
1. response.output_item.added (type: x_search_call)
2. response.output_item.done (type: custom_tool_call)  ← クエリ詳細
3. response.output_item.added (type: message)
4. response.content_part.added
5. response.output_text.delta (テキストチャンク)
6. response.output_text.annotation.added  ← citationsここに含まれる
7. response.output_item.done (type: message)  ← 最終的なannotations
8. response.completed
```

---

## 2. X API（旧Twitter API）詳細調査

### 2.1 料金体系（2025年11月更新）

**従量課金制（Pay-per-use）に移行**

| 項目 | 内容 |
|------|------|
| **Free tier** | 月500 posts、1リクエスト/24時間（開発・テスト専用） |
| **Pay-per-use** | 使用した分だけ課金（サブスクリプションなし） |
| **重複排除** | 24時間のUTC日単位で重複排除 |

#### クレジット購入時のxAI API還元

| 累積支出額 | 還元率 |
|-----------|--------|
| $0 - $199 | 0% |
| $200 - $499 | 10% |
| $500 - $999 | 15% |
| $1,000+ | 20% |

### 2.2 検索エンドポイント

| エンドポイント | 範囲 | 制限 |
|-------------|------|------|
| `/2/tweets/search/recent` | 過去7日間 | 450リクエスト/15分 |
| `/2/tweets/search/all` | 2006年〜全期間 | 300リクエスト/15分 |

### 2.3 代替サービス比較

| サービス | 料金（月1万件想定） | リアルタイム性 | 規約遵守 | 推奨度 |
|---------|-------------------|--------------|---------|--------|
| **公式X API** | $50-100 | ◎ | ◎ | ⭐⭐⭐ |
| **SociaVault** | $29 | ◎ | ○ | ⭐⭐⭐⭐ |
| **RapidAPI Old Bird V2** | ~$25 | ◎ | △ | ⭐⭐⭐ |
| **Bright Data** | $25-50 | ◎ | ○ | ⭐⭐⭐⭐⭐ |
| **ScraperAPI** | ~$50 | ◎ | ○ | ⭐⭐⭐⭐ |

---

## 3. 代替サービス調査

### 3.1 総合評価

| サービス | 特徴 | 本プロジェクトへの適合性 |
|---------|------|------------------------|
| **SerpAPI** | Google検索経由で間接的にX情報取得 | △ 間接的でリアルタイム性低 |
| **Perplexity API** | 高品質な引用付き回答 | ○ AI統合に最適 |
| **RapidAPI** | 複数プロバイダー比較可能 | ○ 価格・機能のバランス |
| **Nitter** | 無料だが実アカウント必要 | △ 安定性に課題 |

### 3.2 法的リスク

- **hiQ vs LinkedIn判例（2022年確定）**: 公開データのスクレイピングはCFAA違反にならない
- **ただし**: Twitter/Xの利用規約違反は別問題（アカウント停止等のリスク）
- **ログイン後データ**: 法的リスクが高まる

---

## 4. 技術的ワークアラウンド詳細

### 4.1 即座に実施可能な対応

#### A. レスポンス解析の修正（最重要）

現在の実装（`lib/llm/clients/grok.ts`）を修正：

```typescript
// 現在の実装
if (event.type === "response.output_text.annotation.added" && event.annotation) {
  if (event.annotation.type === "url_citation" && event.annotation.url) {
    return {
      type: "citation",
      url: event.annotation.url,
      title: event.annotation.title ?? "",
    };
  }
}

// 追加: response.output_item.done (message) 時のannotationsも処理
if (event.type === "response.output_item.done" && event.item) {
  if (event.item.type === "message" && event.item.content) {
    for (const content of event.item.content) {
      if (content.annotations) {
        for (const annotation of content.annotations) {
          if (annotation.type === "url_citation" && annotation.url) {
            // citationイベントを生成
            yield {
              type: "citation",
              url: annotation.url,
              title: annotation.title ?? "",
            };
          }
        }
      }
    }
  }
}
```

#### B. custom_tool_call タイプの処理

```typescript
// XAI_TOOL_TYPE_MAP に custom_tool_call を追加
const XAI_TOOL_TYPE_MAP: Record<string, GrokToolType> = {
  web_search_call: "web_search",
  x_search_call: "x_search",
  custom_tool_call: "x_search",  // X検索の詳細情報として扱う
  code_interpreter_call: "code_execution",
};

// parseToolCallEvent で custom_tool_call にも対応
private parseToolCallEvent(...) {
  // custom_tool_call の場合は name フィールドで判断
  if (item.type === "custom_tool_call" && item.name) {
    if (item.name.includes("x_")) {
      // X検索関連
      return { ... };
    }
  }
}
```

### 4.2 応答後処理

#### URL抽出・検証

```typescript
// XポストURL専用の検証
const X_URL_PATTERNS = [
  /^https:\/\/x\.com\/i\/status\/\d+$/,      // ポストURL
  /^https:\/\/x\.com\/i\/user\/\d+$/,         // ユーザーURL
  /^https:\/\/twitter\.com\/\w+\/status\/\d+$/, // 旧Twitter URL
];

function normalizeAndValidateXUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // x.comドメインに正規化
    if (urlObj.hostname === 'twitter.com') {
      urlObj.hostname = 'x.com';
    }
    
    // ポストURLの形式を統一
    const statusMatch = urlObj.pathname.match(/\/(\w+)\/status\/(\d+)/);
    if (statusMatch) {
      return `https://x.com/i/status/${statusMatch[2]}`;
    }
    
    return urlObj.toString();
  } catch {
    return null;
  }
}
```

### 4.3 ハイブリッド検索戦略

X検索とWeb検索を組み合わせることで、citationsの網羅性を向上：

```typescript
// 両方のツールを同時に使用
const tools = [
  { type: "web_search" },
  { type: "x_search" }
];

// citationsは両方の検索結果から収集
// X検索のcitations → x.com URLs
// Web検索のcitations → 各種URLs
```

---

## 5. 実装ロードマップ

### Phase 1: 即座の修正（1-2日）

| タスク | 詳細 | ファイル |
|--------|------|---------|
| 1. annotations抽出修正 | `response.output_item.done` (message) 時のannotations処理 | `lib/llm/clients/grok.ts` |
| 2. custom_tool_call対応 | 新しいtypeのパース処理追加 | `lib/llm/clients/grok.ts` |
| 3. URL検証ロジック | XポストURLの正規化・検証 | 新規ユーティリティ |

### Phase 2: 機能強化（1週間）

| タスク | 詳細 |
|--------|------|
| 4. ハイブリッド検索 | X + Web検索の組み合わせ |
| 5. citationsの重複除去 | 同一URLの統合 |
| 6. UI改善 | citations表示の最適化 |

### Phase 3: 最適化（2週間〜）

| タスク | 詳細 |
|--------|------|
| 7. キャッシュ機構 | 検索結果の永続化 |
| 8. レート制限対策 | 最適なリクエスト間隔 |
| 9. フォールバック | X API直接統合の検討 |

---

## 6. コード例

### 6.1 修正後のイベント処理

```typescript
// lib/llm/clients/grok.ts - processEvent メソッド

const processEvent = (event: XAIStreamEvent): SSEEvent | null => {
  // テキストチャンク
  if (event.type === "response.output_text.delta" && event.delta) {
    return { type: "content", delta: event.delta };
  }

  // ツール呼び出し開始
  if (event.type === "response.output_item.added" && event.item) {
    return this.parseToolCallEvent(event.item, "running");
  }

  // ツール呼び出し完了
  if (event.type === "response.output_item.done" && event.item) {
    const toolCall = this.parseToolCallEvent(event.item, "completed");
    
    // messageタイプの場合、annotationsからcitationsを抽出
    if (event.item.type === "message" && event.item.content) {
      for (const content of event.item.content) {
        if (content.annotations) {
          for (const annotation of content.annotations) {
            if (annotation.type === "url_citation" && annotation.url) {
              // 注意: ここではyieldできないので、別途処理が必要
              console.log("Citation found:", annotation.url);
            }
          }
        }
      }
    }
    
    return toolCall;
  }

  // 引用URL（ストリーミング中）
  if (event.type === "response.output_text.annotation.added" && event.annotation) {
    if (event.annotation.type === "url_citation" && event.annotation.url) {
      return {
        type: "citation",
        url: event.annotation.url,
        title: event.annotation.title ?? "",
      };
    }
  }

  // 完了
  if (event.type === "response.completed" && event.response?.usage) {
    // ... usage処理
  }

  return null;
};
```

### 6.2 citations収集用のステート管理

```typescript
// hooks/useLLMStream/index.ts

interface StreamState {
  content: string;
  toolCalls: ToolCallInfo[];
  citations: CitationInfo[];  // 追加
  usage?: UsageInfo;
}

// citationイベント受信時の処理
case "citation":
  setState(prev => ({
    ...prev,
    citations: [...prev.citations, { url: event.url, title: event.title }]
  }));
  break;
```

---

## 7. 検証方法

### 7.1 手動検証スクリプト

```bash
# 調査スクリプトを実行
npx tsx scripts/investigate-tool-response.ts

# 出力を確認
cat /tmp/xai_tool_investigation.json | jq '.events[] | select(.type | contains("annotation"))'
```

### 7.2 確認項目

- [ ] `response.output_text.annotation.added` イベントが発火するか
- [ ] `response.output_item.done` (message) にannotationsが含まれるか
- [ ] X検索実行時のcitationsにx.com URLsが含まれるか
- [ ] Web検索との併用時に両方のcitationsが取得できるか

---

## 8. まとめ

### 8.1 主要な発見

1. **X検索のcitations取得は可能** - 従来の調査結果は誤り（または一時的な問題）
2. **SDKの互換性が課題** - `custom_tool_call` typeを処理できるように修正が必要
3. **レスポンス構造が複雑** - 複数の場所からcitationsを収集する必要がある

### 8.2 推奨アクション

| 優先度 | アクション | 実装工数 |
|--------|-----------|---------|
| P0 | `lib/llm/clients/grok.ts` のレスポンス解析修正 | 2-4時間 |
| P1 | `custom_tool_call` タイプの対応 | 2時間 |
| P1 | URL検証・正規化ロジックの追加 | 2時間 |
| P2 | ハイブリッド検索の実装 | 1日 |
| P3 | キャッシュ機構の導入 | 2-3日 |

### 8.3 最終結論

**X検索のcitations取得はAPI制約ではなく、実装の問題**

適切なレスポンス解析を実装することで、X検索でもWeb検索と同様にcitationsを取得可能です。

即座に修正を実施することを推奨します。

---

## 関連リンク

- [xAI Responses API 仕様](./xai-responses-api-spec.md)
- [ツール詳細表示機能実装計画](../plans/tool-details-display.md)
- [Vercel AI SDK Issue #10607](https://github.com/vercel/ai/issues/10607)
- [xAI 公式ドキュメント](https://docs.x.ai/docs/responses)
