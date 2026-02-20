# Grok Agent Tools API 仕様

> **最終更新**: 2026-02-20 19:00

## 概要

xAIのAgent Tools APIは、Grokモデルにサーバーサイドで実行されるツールを提供します。これにより、AIは自律的にツールを使いこなし、Web検索、コード実行、ドキュメント検索などを行うことができます。

## 重要な変更（2026-02-20）

### ツール設定の変更

**以前**: DB（`SystemSettings`テーブル）で機能別にツールON/OFFを管理  
**現在**: **全ツールを常時有効化** - DB設定に関わらずすべてのツールが使用可能

```typescript
// lib/settings/db.ts
// 常に全ツール有効を返すように変更
export async function isToolEnabled(): Promise<boolean> {
  return true; // 全ツール常時有効
}
```

### 変更理由

- ユーザー体験の向上（設定を気にせず全機能が使える）
- 管理の簡素化（不要な設定画面の操作を削減）
- コスト管理は使用量監視で対応（`/admin/usage`）

---

## ツール一覧

### 1. Web Search (`web_search`)

| 項目 | 内容 |
|------|------|
| **名前** | Web検索 |
| **API名** | `web_search` |
| **説明** | インターネットからリアルタイムで最新情報を検索・閲覧 |
| **状態** | **常時有効** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4.1 Fast Reasoning |

#### パラメータ

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `allowed_domains` | string[] | 検索対象ドメインを限定（最大5つ） |
| `excluded_domains` | string[] | 除外ドメインを指定（最大5つ） |
| `enable_image_understanding` | boolean | 検索結果の画像解析を有効化 |

---

### 2. X Search (`x_search`)

| 項目 | 内容 |
|------|------|
| **名前** | X検索 |
| **API名** | `x_search` |
| **説明** | X（Twitter）からリアルタイム投稿、ユーザー、スレッドを検索 |
| **状態** | **常時有効** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4.1 Fast Reasoning |

#### パラメータ

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `allowed_x_handles` | string[] | 特定アカウントの投稿のみ検索（最大10つ） |
| `excluded_x_handles` | string[] | 特定アカウントを除外（最大10つ） |
| `from_date` | string | 検索開始日（ISO8601形式: YYYY-MM-DD） |
| `to_date` | string | 検索終了日（ISO8601形式: YYYY-MM-DD） |
| `enable_image_understanding` | boolean | X投稿内の画像解析を有効化 |
| `enable_video_understanding` | boolean | X投稿内の動画解析を有効化 |

---

### 3. Code Execution (`code_execution`)

| 項目 | 内容 |
|------|------|
| **名前** | コード実行 |
| **API名** | `code_execution` |
| **説明** | Pythonコードを安全なサンドボックス環境で実行 |
| **状態** | **常時有効** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4.1 Fast Reasoning |

#### 機能

- 数値計算・データ分析
- グラフ・チャート生成
- 統計処理
- シミュレーション実行

---

### 4. Collections Search (`collections_search` / `file_search`)

| 項目 | 内容 |
|------|------|
| **名前** | ファイル検索 / コレクション検索 |
| **API名** | `collections_search` (xAI SDK) / `file_search` (OpenAI API) |
| **説明** | アップロードしたドキュメント・ナレッジベースを検索 |
| **状態** | **常時有効** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4.1 Fast Reasoning |

#### 機能

- セマンティック検索（意味ベースの検索）
- PDF、テキスト、CSVなど複数形式対応
- RAG（Retrieval-Augmented Generation）ワークフロー
- 社内文書・規約の参照

---

## ツール使用量の監視

### 管理画面

`/admin/usage` でツール別の使用量を確認できます。

#### 表示項目

| 項目 | 説明 |
|------|------|
| **ツール別リクエスト数** | 各ツールの使用回数 |
| **ツール別コスト** | 各ツールに関連するAPIコスト |
| **最近の使用履歴** | 個別リクエストのツール使用状況 |

#### ツール使用情報の記録

```typescript
// UsageLog.metadata に記録
{
  tools: {
    webSearch: true,
    xSearch: true,
    codeExecution: true,
    fileSearch: true,
  }
}
```

---

## 実装詳細

### GrokClient のデフォルト設定

```typescript
// lib/llm/clients/grok.ts
constructor(provider: LLMProvider, toolOptions?: GrokToolOptions) {
  this.provider = provider;
  this.model = this.getModelName(provider);
  // デフォルトで全ツール有効
  this.toolOptions = {
    enableWebSearch: true,
    enableXSearch: true,
    enableCodeExecution: true,
    enableFileSearch: true,
    ...toolOptions,
  };
}
```

### APIでのツール情報記録

```typescript
// app/api/llm/stream/route.ts
await trackUsage({
  userId,
  provider,
  inputTokens: usage.inputTokens,
  outputTokens: usage.outputTokens,
  metadata: {
    requestId,
    method: "stream",
    tools: {
      webSearch: true,
      xSearch: true,
      codeExecution: true,
      fileSearch: true,
    },
  },
});
```

---

## 廃止された機能

### 管理画面 `/admin/grok-tools`

**状態**: 画面は残存（後方互換性のため）  
**動作**: 設定変更は保存されるが、実際の動作には影響しない

```typescript
// lib/settings/db.ts
// 以下の関数は常に true を返すように変更
- isToolEnabled() 
- isGrokToolEnabled()
```

### DBテーブル

**`GrokToolSettings`（ユーザー別設定）**: 維持（後方互換性）  
**`SystemSettings`（システム設定）**: 維持（他の設定に使用）

---

## 参考リンク

- [xAI Tools Overview](https://docs.x.ai/developers/tools/overview)
- [Web Search Tool](https://docs.x.ai/developers/tools/web-search)
- [Collections Search Tool](https://docs.x.ai/developers/tools/collections-search)
- [Grok 4.1 Fast Announcement](https://x.ai/news/grok-4-1-fast)
- [Vercel AI SDK - xAI Provider](https://ai-sdk.dev/providers/ai-sdk-providers/xai)
