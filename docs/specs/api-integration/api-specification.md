# API仕様

> **REST APIエンドポイント定義**
> 
> **最終更新**: 2026-02-22 11:05

---

## 概要

| 項目 | 内容 |
|------|------|
| **ベースURL** | `/api` |
| **認証** | NextAuth.jsセッションCookie（自動検証） |
| **フォーマット** | JSON / Server-Sent Events (SSE) |
| **レート制限** | 30 RPM / 1,500 RPD（Upstash Redis管理） |

---

## エラーレスポンス

詳細: [error-handling.md](../operations/error-handling.md)

```json
{
  "error": "ERROR_CODE",
  "message": "人間可読なメッセージ",
  "details": { ... }
}
```

---

## エンドポイント一覧

### LLM

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/llm/chat` | 非同期チャット |
| POST | `/api/llm/stream` | ストリーミングチャット（SSE） |
| POST | `/api/llm/langchain/chat` | LangChain統合チャット |
| POST | `/api/llm/rag/query` | RAG検索クエリ |

**リクエスト（非同期）:**
```json
{
  "messages": [{ "role": "user", "content": "..." }],
  "provider": "grok-4-1-fast-reasoning",
  "featureId": "research-cast"
}
```

**レスポンス:**
```json
{
  "content": "応答テキスト",
  "thinking": "思考プロセス",
  "usage": { 
    "inputTokens": 100, 
    "outputTokens": 50, 
    "cost": 0.0001 
  }
}
```

詳細: [llm-integration.md](./llm-integration.md)

---

### 機能別チャット

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/chat/feature?chatId={id}` | 特定チャットの履歴取得 |
| GET | `/api/chat/feature?featureId={id}` | チャット一覧取得（サイドバー用） |
| POST | `/api/chat/feature` | 新規チャット作成 or メッセージ追加 |
| DELETE | `/api/chat/feature?chatId={id}` | 特定チャット削除 |
| GET | `/api/chat/history` | 全機能のチャット履歴一覧 |

**featureId一覧:**
| ID | 機能 | 状態 |
|---|------|------|
| `chat` | 汎用チャット | ✅ 利用可能 |
| `research-cast` | 出演者リサーチ | ✅ 利用可能 |
| `research-evidence` | エビデンスリサーチ | ✅ 利用可能 |
| `minutes` | 議事録作成 | ✅ 利用可能 |
| `proposal` | 新企画立案 | ✅ 利用可能 |
| `transcript` | 文字起こし変換 | ✅ 利用可能 |
| `na-script` | NA原稿作成 | ✅ 利用可能 |
| `meeting-notes` | 会議メモ | ✅ 利用可能 |
| `research-location` | 場所リサーチ | ⏸️ 4月以降実装予定 |
| `research-info` | 情報リサーチ | ⏸️ 4月以降実装予定 |

---

### 機能別API

| 機能 | エンドポイント | メソッド |
|-----|---------------|---------|
| 議事録 | `/api/meeting-notes` | POST |
| 文字起こし | `/api/transcripts` | POST |
| リサーチ | `/api/research` | POST |
| ロケスケ | `/api/schedules` | GET, POST |
| 番組設定 | `/api/settings/program` | GET, POST |
| ファイルアップロード | `/api/upload` | POST |
| エクスポート | `/api/export/word` | POST |

---

### Google Drive連携

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/drive/files` | ファイル一覧取得 |
| POST | `/api/drive/download` | ファイルダウンロード |

---

### 管理画面API

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/admin/users` | ユーザー一覧 |
| GET | `/api/admin/usage` | 使用量統計 |
| GET | `/api/admin/logs` | アプリケーションログ |
| GET | `/api/admin/prompts` | システムプロンプト一覧 |
| PUT | `/api/admin/prompts/[key]` | プロンプト更新 |
| GET | `/api/admin/prompts/[key]/history` | バージョン履歴 |
| POST | `/api/admin/prompts/[key]/restore` | バージョン復元 |

---

### 認証

| メソッド | パス | 説明 |
|---------|------|------|
| ALL | `/api/auth/[...nextauth]` | NextAuth.jsハンドラー |

詳細: [authentication.md](./authentication.md)

---

## ステータスコード

| コード | 説明 |
|-------|------|
| 200 | 成功 |
| 400 | バリデーションエラー |
| 401 | 認証エラー |
| 403 | 権限エラー（管理者のみ機能） |
| 429 | レート制限超過 |
| 500 | サーバーエラー |
| 502 | 外部APIエラー（LLM等） |

詳細: [error-handling.md](../operations/error-handling.md#エラーコード一覧)

---

## レート制限

| 制限 | 値 | 説明 |
|-----|-----|------|
| RPM | 30 | 1分あたりのリクエスト数 |
| RPD | 1,500 | 1日あたりのリクエスト数 |
| LLM RPM | 60 | LLM APIの1分あたり制限 |
| LLM RPD | 10,000 | LLM APIの1日あたり制限 |

詳細: [logging-monitoring.md](../operations/logging-monitoring.md#レート制限)

---

## 型定義

```typescript
// 共通型
interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface LLMResponse {
  content: string;
  thinking?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

interface ChatSession {
  id: string;
  featureId: string;
  title: string;
  messages: LLMMessage[];
  createdAt: string;
  updatedAt: string;
}
```

完全な型定義: `types/` ディレクトリ参照

---

## 関連ファイル

- `app/api/` - APIエンドポイント実装
- `lib/api/` - APIユーティリティ
- `middleware.ts` - 認証・レート制限ミドルウェア
- [llm-integration.md](./llm-integration.md) - LLM API詳細
