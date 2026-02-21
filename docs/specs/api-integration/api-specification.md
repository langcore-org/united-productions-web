# API仕様

> **REST APIエンドポイント定義**

## 概要

- **ベースURL**: `/api`
- **認証**: NextAuth.jsセッションCookie（自動検証）
- **フォーマット**: JSON

## エラーレスポンス

詳細: [error-handling.md](./error-handling.md)

```json
{
  "error": "ERROR_CODE",
  "message": "人間可読なメッセージ",
  "details": { ... }
}
```

## エンドポイント一覧

### LLM

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/llm/chat` | 非同期チャット |
| POST | `/api/llm/stream` | ストリーミングチャット |

**リクエスト:**
```json
{
  "messages": [{ "role": "user", "content": "..." }],
  "provider": "gemini-2.5-flash-lite"
}
```

**レスポンス:**
```json
{
  "content": "応答テキスト",
  "usage": { "inputTokens": 100, "outputTokens": 50, "cost": 0.0001 }
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

**featureId一覧:**
| ID | 機能 |
|---|------|
| `research-cast` | 出演者リサーチ |
| `research-location` | 場所リサーチ |
| `research-info` | 情報リサーチ |
| `research-evidence` | エビデンスリサーチ |
| `minutes` | 議事録作成 |
| `proposal` | 新企画立案 |
| `transcript` | 文字起こし変換 |
| `transcript-na` | NA原稿作成 |

---

### 機能別API

| 機能 | エンドポイント | メソッド |
|-----|---------------|---------|
| 議事録 | `/api/meeting-notes` | POST |
| 文字起こし | `/api/transcripts` | POST |
| リサーチ | `/api/research` | POST |
| ロケスケ | `/api/schedules` | GET, POST |
| 番組設定 | `/api/settings/program` | GET, POST |

---

### 認証

| メソッド | パス | 説明 |
|---------|------|------|
| ALL | `/api/auth/[...nextauth]` | NextAuth.jsハンドラー |

詳細: [authentication.md](./authentication.md)

## ステータスコード

| コード | 説明 |
|-------|------|
| 200 | 成功 |
| 400 | バリデーションエラー |
| 401 | 認証エラー |
| 429 | レート制限超過 |
| 500 | サーバーエラー |
| 502 | 外部APIエラー |

詳細: [error-handling.md](./error-handling.md#エラーコード一覧)

## レート制限

| 制限 | 値 |
|-----|-----|
| RPM | 30 |
| RPD | 1,500 |

詳細: [logging-monitoring.md](./logging-monitoring.md#レート制限)

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
```

完全な型定義: `types/` ディレクトリ参照
