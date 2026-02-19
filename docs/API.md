# API仕様書

## 概要

AI HubのREST API仕様です。すべてのAPIはJSON形式で通信し、認証が必要なエンドポイントではJWTトークンを使用します。

## ベースURL

```
開発環境: http://localhost:3000/api
本番環境: https://<your-domain>/api
```

## 認証

### NextAuth.js セッション

認証が必要なエンドポイントでは、NextAuth.jsのセッションCookieが自動的に検証されます。

### レスポンス形式

#### 成功時
```json
{
  "success": true,
  "data": { ... }
}
```

#### エラー時
```json
{
  "error": "エラーコード",
  "message": "人間可読なエラーメッセージ",
  "details": { ... }
}
```

## エンドポイント一覧

### 認証

#### GET /api/auth/[...nextauth]
NextAuth.jsの認証ハンドラー

---

### LLM

#### POST /api/llm/chat
非同期チャット完了

**リクエスト:**
```json
{
  "messages": [
    { "role": "user", "content": "こんにちは" }
  ],
  "provider": "gemini-2.5-flash-lite"
}
```

**レスポンス:**
```json
{
  "content": "こんにちは！何かお手伝いできることはありますか？",
  "thinking": null,
  "usage": {
    "inputTokens": 10,
    "outputTokens": 20,
    "cost": 0.000008
  },
  "cached": false
}
```

**エラーレスポンス:**
| ステータス | 説明 |
|-----------|------|
| 400 | バリデーションエラー |
| 500 | サーバーエラー |
| 502 | LLM APIエラー |

---

#### POST /api/llm/stream
ストリーミングレスポンス

**リクエスト:**
```json
{
  "messages": [
    { "role": "user", "content": "こんにちは" }
  ],
  "provider": "gemini-2.5-flash-lite"
}
```

**レスポンス:** Server-Sent Events
```
data: {"content": "こん"}
data: {"content": "にち"}
data: {"content": "は"}
data: [DONE]
```

---

### 機能別チャット (Feature Chat)

#### GET /api/chat/feature?featureId={featureId}
会話履歴を取得

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|-----|-----|------|------|
| featureId | string | ✓ | 機能識別子 |

**featureId一覧:**
| featureId | 機能 |
|-----------|------|
| research-cast | 出演者リサーチ |
| research-location | 場所リサーチ |
| research-info | 情報リサーチ |
| research-evidence | エビデンスリサーチ |
| minutes | 議事録作成 |
| proposal | 新企画立案 |
| transcript | 文字起こし変換 |
| transcript-na | NA原稿作成 |

**レスポンス:**
```json
{
  "messages": [
    {
      "id": "msg_123",
      "role": "user",
      "content": "企画内容を入力",
      "timestamp": "2026-02-19T10:00:00Z",
      "llmProvider": "gemini-2.5-flash-lite"
    },
    {
      "id": "msg_124",
      "role": "assistant",
      "content": "リサーチ結果...",
      "timestamp": "2026-02-19T10:00:05Z",
      "llmProvider": "gemini-2.5-flash-lite"
    }
  ]
}
```

---

#### POST /api/chat/feature
会話履歴を保存

**リクエスト:**
```json
{
  "featureId": "research-cast",
  "messages": [
    {
      "id": "msg_123",
      "role": "user",
      "content": "企画内容を入力",
      "timestamp": "2026-02-19T10:00:00Z"
    },
    {
      "id": "msg_124",
      "role": "assistant",
      "content": "リサーチ結果...",
      "timestamp": "2026-02-19T10:00:05Z",
      "llmProvider": "gemini-2.5-flash-lite"
    }
  ]
}
```

**レスポンス:**
```json
{
  "success": true
}
```

---

### 議事録 (PJ-A)

#### POST /api/meeting-notes
Zoom文字起こしを議事録に整形

**リクエスト:**
```json
{
  "transcript": "Zoomの文字起こしテキスト...",
  "template": "meeting",
  "provider": "gemini-2.5-flash-lite"
}
```

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|-----|-----|------|------|
| transcript | string | ✓ | Zoom文字起こしテキスト |
| template | "meeting" \| "interview" | ✓ | テンプレート種別 |
| provider | string | | LLMプロバイダー（デフォルト: gemini-2.5-flash-lite） |

**レスポンス:**
```json
{
  "content": "## 会議概要\n...",
  "usage": {
    "inputTokens": 1000,
    "outputTokens": 500,
    "cost": 0.000225
  }
}
```

---

### 文字起こし (PJ-B)

#### POST /api/transcripts
Premiere Pro書き起こしをNA原稿に整形

**リクエスト:**
```json
{
  "transcript": "Premiere Proの書き起こしテキスト...",
  "provider": "gemini-2.5-flash-lite"
}
```

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|-----|-----|------|------|
| transcript | string | ✓ | Premiere Pro書き起こしテキスト |
| provider | string | | LLMプロバイダー（デフォルト: gemini-2.5-flash-lite） |

**レスポンス:**
```json
{
  "content": "**櫻井**: 今日はよろしくお願いします。\n\n**末澤**: こちらこそ...",
  "usage": {
    "inputTokens": 2000,
    "outputTokens": 1500,
    "cost": 0.000525
  }
}
```

---

### リサーチ (PJ-C)

#### POST /api/research
リサーチエージェントによる調査

**リクエスト:**
```json
{
  "agentType": "people",
  "query": "東京都在住の30代プログラマーを探してください",
  "provider": "grok-4.1-fast",
  "stream": false
}
```

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|-----|-----|------|------|
| agentType | "people" \| "evidence" \| "location" | ✓ | エージェント種別 |
| query | string | ✓ | 検索クエリ |
| provider | string | | LLMプロバイダー（デフォルトはagentTypeにより自動選択） |
| stream | boolean | | ストリーミングレスポンス（デフォルト: false） |

**エージェント別デフォルトプロバイダー:**
| agentType | デフォルトプロバイダー | 用途 |
|-----------|---------------------|------|
| people | grok-4.1-fast | X検索で人物特定 |
| evidence | perplexity-sonar | エビデンス検索 |
| location | perplexity-sonar | ロケ地検索 |

**レスポンス:**
```json
{
  "content": "## 候補者リスト\n...",
  "usage": {
    "inputTokens": 100,
    "outputTokens": 800,
    "cost": 0.00046
  },
  "citations": ["https://example.com/1", "https://example.com/2"]
}
```

---

### ロケスケジュール (PJ-D)

#### GET /api/schedules
API情報取得

**レスポンス:**
```json
{
  "success": true,
  "message": "Schedule API is running",
  "endpoints": {
    "POST /api/schedules?action=generate": "スケジュール自動生成",
    "POST /api/schedules?action=export": "スケジュールエクスポート"
  }
}
```

---

#### POST /api/schedules?action=generate
スケジュール自動生成

**リクエスト:**
```json
{
  "masterSchedule": "マスタースケジュールテキスト...",
  "type": "actor",
  "additionalInstructions": "特別な指示があれば記載"
}
```

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|-----|-----|------|------|
| masterSchedule | string | ✓ | マスタースケジュールテキスト |
| type | "actor" \| "staff" \| "vehicle" | ✓ | 生成タイプ |
| additionalInstructions | string | | 追加指示 |

**生成タイプ:**
| type | 説明 |
|------|------|
| actor | 演者別スケジュール |
| staff | 香盤表（スタッフ動き） |
| vehicle | 車両表 |

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "content": "# 【演者名】スケジュール\n...",
    "type": "actor",
    "usage": {
      "inputTokens": 500,
      "outputTokens": 1000,
      "cost": 0.000337
    }
  }
}
```

---

#### POST /api/schedules?action=export
スケジュールエクスポート

**リクエスト:**
```json
{
  "content": "スケジュール内容（Markdown）...",
  "format": "csv",
  "filename": "schedule_2026-02-16"
}
```

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|-----|-----|------|------|
| content | string | ✓ | エクスポートする内容 |
| format | "markdown" \| "csv" | ✓ | エクスポート形式 |
| filename | string | | ファイル名（拡張子なし） |

**レスポンス:** ファイルダウンロード（Content-Disposition: attachment）

---

### 番組設定

#### GET /api/settings/program
現在の番組設定を取得

**レスポンス:**
```json
{
  "programInfo": "番組のコンセプト...",
  "pastProposals": "過去の企画一覧...",
  "updatedAt": "2026-02-19T10:00:00Z"
}
```

---

#### POST /api/settings/program
番組設定を保存

**リクエスト:**
```json
{
  "programInfo": "番組のコンセプト、ターゲット視聴者、放送時間帯など...",
  "pastProposals": "過去の企画一覧..."
}
```

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|-----|-----|------|------|
| programInfo | string | ✓ | 番組情報（コンセプト、ターゲットなど） |
| pastProposals | string | ✓ | 過去の企画一覧 |

**レスポンス:**
```json
{
  "success": true,
  "programInfo": "番組のコンセプト...",
  "pastProposals": "過去の企画一覧...",
  "updatedAt": "2026-02-19T10:00:00Z"
}
```

**用途:**
- 新企画立案（`/proposal`）で使用
- システムプロンプトに動的に挿入され、番組特性に合わせた企画提案を実現

---

## ステータスコード

| コード | 説明 |
|-------|------|
| 200 | 成功 |
| 400 | バリデーションエラー |
| 401 | 認証エラー |
| 403 | 権限エラー |
| 404 | リソースが見つからない |
| 429 | レート制限超過 |
| 500 | サーバーエラー |
| 502 | 外部APIエラー |
| 503 | サービス利用不可 |

## レート制限

APIには以下のレート制限が適用されます：

### デフォルト制限
- RPM (Requests Per Minute): 30
- RPD (Requests Per Day): 1,500

### レート制限ヘッダー
レスポンスヘッダーに制限情報が含まれます：

```
X-RateLimit-Limit-RPM: 30
X-RateLimit-Limit-RPD: 1500
X-RateLimit-Remaining-RPM: 25
X-RateLimit-Remaining-RPD: 1480
X-RateLimit-Used-RPM: 5
X-RateLimit-Used-RPD: 20
```

### レート制限超過時
ステータスコード `429` で以下のレスポンスが返されます：

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

## LLMプロバイダー一覧

| プロバイダーID | 表示名 | 入力価格/1M | 出力価格/1M | コンテキスト |
|--------------|--------|-----------|-----------|------------|
| gemini-2.5-flash-lite | Gemini 2.5 Flash-Lite | $0.075 | $0.30 | 1M |
| gemini-3.0-flash | Gemini 3.0 Flash | $0.50 | $3.00 | 1M |
| grok-4.1-fast | Grok 4.1 Fast | $0.20 | $0.50 | 2M |
| grok-4 | Grok 4 | $3.00 | $15.00 | 2M |
| gpt-4o-mini | GPT-4o-mini | $0.15 | $0.60 | 128K |
| gpt-5 | GPT-5 | $1.25 | $10.00 | 400K |
| claude-sonnet-4.5 | Claude 4.5 Sonnet | $3.00 | $15.00 | 200K |
| claude-opus-4.6 | Claude Opus 4.6 | $5.00 | $25.00 | 200K |
| perplexity-sonar | Perplexity Sonar | $1.00 | $1.00 | 128K |
| perplexity-sonar-pro | Perplexity Sonar Pro | $2.00 | $2.00 | 128K |

## 型定義

### LLMMessage
```typescript
{
  role: "user" | "assistant" | "system";
  content: string;
}
```

### LLMResponse
```typescript
{
  content: string;
  thinking?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}
```

### Usage
```typescript
{
  inputTokens: number;
  outputTokens: number;
  cost: number;
}
```

### FeatureChatMessage
```typescript
{
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  llmProvider?: LLMProvider;
}
```

### ProgramSettings
```typescript
{
  programInfo: string;      // 番組情報（コンセプト、ターゲットなど）
  pastProposals: string;    // 過去の企画一覧
  updatedAt?: Date;
}
```
