# X検索 Citations ワークアラウンド調査

> **調査日**: 2026-02-26  
> **調査対象**: xAI Responses API の X検索ツールにおける citations 取得制約  
> **関連ファイル**: 
> - `docs/specs/api-integration/xai-responses-api-spec.md`
> - `docs/plans/tool-details-display.md`
> - `lib/llm/clients/grok.ts`

---

## 問題の概要

| ツール | citations取得 | 理由 |
|--------|--------------|------|
| **Web検索** | ✅ 可能 | `message.annotations` に `url_citation` として含まれる |
| **X検索** | ❌ **不可** | プライバシー保護のため、APIレスポンスに結果が含まれない |

### 実際のAPIレスポンス比較

#### Web検索完了時（`output_item.done`）

```json
{
  "type": "response.output_item.done",
  "item": {
    "id": "ws_xxxxx_call_xxxxx",
    "type": "web_search_call",
    "status": "completed",
    "action": {
      "type": "search",
      "query": "OpenAI GPT-5 latest news release date",
      "sources": []  // ← 常に空
    }
  }
}
```

**citationsの取得場所**: `message.annotations` に `url_citation` として含まれる

```json
{
  "type": "response.output_item.done",
  "item": {
    "content": [{
      "annotations": [
        { "type": "url_citation", "url": "https://openai.com/...", "title": "1" }
      ]
    }]
  }
}
```

#### X検索完了時（`output_item.done`）

```json
{
  "type": "response.output_item.done",
  "item": {
    "call_id": "xs_call_xxxxx",
    "input": "{\"query\":\"OpenAI GPT-5 release updates\",\"limit\":10}",
    "name": "x_semantic_search",
    "type": "custom_tool_call",
    "id": "ctc_xxxxx_xs_call_xxxxx",
    "status": "completed"
    // ← result フィールドなし、annotations もなし
  }
}
```

**重要**: X検索の結果はAPIレスポンスに含まれない（プライバシー保護のため）。

---

## 検討したワークアラウンド

### 1. `include: ["inline_citations"]` パラメータの使用

**調査結果**: xAI Responses APIには `include` パラメータによるcitations制御は**存在しない**

- xAI SDK（Python/JavaScript）の調査では、`include` パラメータは確認できず
- 実際のAPI呼び出し（`scripts/investigate-tool-response.ts`）でも該当オプションは機能しない
- Web検索のcitationsは常に `message.annotations` に含まれ、X検索は含まれない

**結論**: このワークアラウンドは**不可行**

---

### 2. X API（旧Twitter API）の直接使用

**技術的実現性**: ✅ 可能

| 項目 | 内容 |
|------|------|
| **アクセス方法** | developer.x.com から開発者アカウントを作成 |
| **検索エンドポイント** | `/2/tweets/search/recent`（過去7日間） |
| **認証** | OAuth 1.0a または OAuth 2.0 App-Only |
| **レート制限** | Basic: 100リクエスト/15分<br>Pro: 500リクエスト/15分 |
| **コスト** | 従量課制（Basic: $100/月、Pro: $5,000/月） |

**実装パターン**:

```typescript
// X API v2を使用した検索
const searchTweets = async (query: string) => {
  const response = await fetch(
    `https://api.x.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&tweet.fields=author_id,created_at`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.X_BEARER_TOKEN}`
      }
    }
  );
  return response.json();
};
```

**課題**:

| 課題 | 詳細 |
|------|------|
| **コスト** | 無料枠がない（最低$100/月から） |
| **複雑性** | xAI APIとは別の認証・レート制限管理が必要 |
| **統合** | xAIの検索結果とX APIの結果を統合するロジックが複雑化 |
| **リアルタイム性** | xAIのストリーミングレスポンスと同期が困難 |

**結論**: 技術的には可能だが、**コストと複雑性の観点から現時点では推奨しない**

---

### 3. Web検索でXの投稿を検索（`site:x.com`）

**アプローチ**: Web検索ツールに `site:x.com` クエリを使用してXの投稿を検索

```json
{
  "tools": [{"type": "web_search"}],
  "input": [{"role": "user", "content": "OpenAI GPT-5 site:x.com"}]
}
```

**メリット**:
- citations取得可能（Web検索と同様）
- 追加のAPIキー不要

**デメリット**:
- X検索ツールほどの精度・網羅性はない
- リアルタイム性が低い（Web検索のインデックス遅延）
- X検索特有の機能（セマンティック検索、ユーザー検索等）が使えない

**結論**: **部分的な代替策として検討可能**だが、完全な置き換えではない

---

### 4. X検索結果のテキスト解析

**アプローチ**: AIの応答テキストからXの投稿URLを抽出

```typescript
// 応答テキストからX/Twitter URLを抽出
const extractXUrls = (text: string): string[] => {
  const xUrlPattern = /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[^\s]+/g;
  return text.match(xUrlPattern) || [];
};
```

**メリット**:
- API変更なしで実装可能
- X検索を使用した応答からURLを抽出できる

**デメリット**:
- 不完全（すべての参照URLが含まれているとは限らない）
- 信頼性が低い（URL形式の変化に弱い）

**結論**: **フォールバック策として検討可能**

---

## 推奨対応

### 現時点（短期）

1. **X検索のcitations取得は諦め、UIで適切に表示**
   - "検索結果はプライバシー保護のため表示されません" と表示
   - 実装済み: `docs/plans/tool-details-display.md`

2. **X検索のクエリは表示**
   - 検索クエリ自体は取得可能（`item.input` から抽出）
   - 実装済み: `lib/llm/clients/grok.ts`

3. **応答テキストからのURL抽出はフォールバックとして検討**
   - 正規表現でXのURLを抽出し、citationsとして表示
   - 優先度: 低

### 将来（長期）

1. **xAI側の対応を待つ**
   - xAI APIがX検索のcitationsを提供するようになった場合、即座に対応
   - 現在の実装（`response.output_text.annotation.added` の処理）はそのまま流用可能

2. **X APIの導入を検討（需要が高まった場合）**
   - ユーザーからの要望が多い場合、X APIの導入を検討
   - コストとメンテナンスの観点から慎重に判断

---

## 実装メモ

### 現在の実装状況

```typescript
// lib/llm/clients/grok.ts
// X検索のクエリ抽出は実装済み
private parseToolCallEvent(...) {
  // X検索等: input JSONから query を抽出
  if (item.input) {
    try {
      const parsed = JSON.parse(item.input);
      input = parsed.query ?? item.input;
    } catch {
      input = item.input;
    }
  }
}
```

```typescript
// citationsの取得（Web検索のみ）
if (event.type === "response.output_text.annotation.added" && event.annotation) {
  if (event.annotation.type === "url_citation" && event.annotation.url) {
    return {
      type: "citation",
      url: event.annotation.url,
      title: event.annotation.title ?? "",
    };
  }
}
```

### X検索使用時のUI表示

```typescript
// ToolCallMessage での表示例
{
  type: "x_search",
  query: "GPT-5 from:OpenAI",  // 表示可能
  citations: [],  // 空（取得不可）
  note: "検索結果はプライバシー保護のため表示されません"
}
```

---

## まとめ

| ワークアラウンド | 可行性 | 推奨度 | 備考 |
|----------------|--------|--------|------|
| `include` パラメータ | ❌ 不可 | - | APIに存在しない |
| X API直接使用 | ✅ 技術的可能 | △ 低 | コスト・複雑性の問題 |
| Web検索で代替 | ✅ 可能 | ○ 中 | 部分的な代替策 |
| テキスト解析 | ✅ 可能 | △ 低 | フォールバック策 |
| **xAI側対応待ち** | - | **◎ 最優先** | 現状維持で問題なし |

**結論**: X検索のcitations取得は現時点ではAPIの制約により不可能。ワークアラウンドはコストや複雑性の観点から現時点では推奨せず、xAI側の対応を待つ。UIでは「プライバシー保護のため表示されません」と適切に説明する。
