# API変更ログ

> **APIのバージョン履歴と破壊的変更の追跡**
> 
> **最終更新**: 2026-02-21 17:15

---

## バージョニング方針

### URLバージョニング

```
/api/v1/meeting-notes
/api/v2/meeting-notes
```

現状は `/api/` パスを使用。v2以降の破壊的変更時に `/api/v2/` を導入予定。

### 後方互換性

| 変更タイプ | 互換性 | 対応 |
|-----------|-------|------|
| エンドポイント追加 | ✅ 互換あり | 即時リリース可能 |
| オプションパラメータ追加 | ✅ 互換あり | 即時リリース可能 |
| レスポンスフィールド追加 | ✅ 互換あり | 即時リリース可能 |
| 必須パラメータ追加 | ❌ 互換なし | 新バージョン or 移行期間設定 |
| レスポンスフィールド削除 | ❌ 互換なし | 新バージョン or 移行期間設定 |
| エンドポイント削除 | ❌ 互換なし | 新バージョン + 非推奨期間 |

---

## 変更履歴

### v1.2.0 (2026-02-21)

#### 追加

| エンドポイント | 説明 | 関連PR |
|--------------|------|--------|
| `GET /api/chat/feature?chatId={id}` | 特定チャットの履歴取得 | - |
| `DELETE /api/chat/feature?chatId={id}` | 特定チャット削除 | - |

#### 変更

| エンドポイント | 変更内容 | 移行期間 |
|--------------|---------|---------|
| `POST /api/chat/feature` | chatIdパラメータ追加（新規/既存判定） | 即時（後方互換あり） |
| `GET /api/chat/feature?featureId={id}` | レスポンス形式変更（messages → chats） | 即時（後方互換あり） |

**新規チャットフロー:**
```typescript
// 1. 新規チャット開始（chatIdなし）
const response = await fetch('/api/chat/feature', {
  method: 'POST',
  body: JSON.stringify({
    featureId: 'research-cast',
    messages: [{ role: 'user', content: '...' }],
    // chatId: undefined（新規作成）
  }),
});
const { chatId } = await response.json(); // 新規chatIdを取得

// 2. 以降のメッセージはchatIdを指定
await fetch('/api/chat/feature', {
  method: 'POST',
  body: JSON.stringify({
    chatId, // 既存チャットに追加
    featureId: 'research-cast',
    messages: [...],
  }),
});
```

#### データベース

| テーブル | 変更内容 |
|---------|---------|
| `ResearchChat` | `title` カラム追加（自動生成） |

---

### v1.1.0 (2026-02-20)

#### 追加

| エンドポイント | 説明 | 関連PR |
|--------------|------|--------|
| `POST /api/export/word` | Markdown → Word変換 | - |
| `POST /api/upload` | ファイルアップロード・テキスト抽出 | - |

#### 変更

| エンドポイント | 変更内容 | 移行期間 |
|--------------|---------|---------|
| `POST /api/llm/chat` | `provider` パラメータを必須化 | 2026-02-20 〜 2026-03-15 |

**移行ガイド:**
```typescript
// 以前（非推奨）
const response = await fetch('/api/llm/chat', {
  method: 'POST',
  body: JSON.stringify({ messages }),
});

// 新しい形式
const response = await fetch('/api/llm/chat', {
  method: 'POST',
  body: JSON.stringify({ 
    messages,
    provider: 'gemini-2.5-flash-lite' // 必須
  }),
});
```

---

### v1.0.0 (2026-02-15)

#### 初期リリース

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/auth/[...nextauth]` | ALL | 認証（NextAuth.js） |
| `/api/llm/chat` | POST | 非同期チャット |
| `/api/llm/stream` | POST | ストリーミングチャット |
| `/api/chat/feature` | GET, POST | 機能別チャット履歴 |
| `/api/meeting-notes` | POST | 議事録作成 |
| `/api/transcripts` | POST | 文字起こし整形 |
| `/api/research` | POST | リサーチ実行 |
| `/api/settings/program` | GET, POST | 番組設定 |

---

## 非推奨（Deprecated）

### 計画中

| エンドポイント | 非推奨予定日 | 削除予定日 | 代替先 |
|--------------|------------|-----------|--------|
| `POST /api/chat` | 2026-03-01 | 2026-04-01 | `POST /api/llm/chat` |

### 非推奨対応のベストプラクティス

```typescript
// 非推奨警告をログに出力
console.warn(
  '[DEPRECATED] POST /api/chat is deprecated. ' +
  'Use POST /api/llm/chat instead. ' +
  'This endpoint will be removed on 2026-04-01.'
);
```

---

## レスポンス形式の変更

### エラーレスポンス

**v1.0.0 以降（現在）:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容を確認してください",
    "details": [
      { "field": "email", "message": "有効なメールアドレスを入力してください" }
    ]
  }
}
```

### 成功レスポンス

**標準形式:**
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-02-20T13:16:00Z",
    "requestId": "req_xxx"
  }
}
```

---

## 型定義の変更

### LLMMessage

**v1.0.0:**
```typescript
interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}
```

**v1.1.0（予定）:**
```typescript
interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: Attachment[]; // 新規追加
}

interface Attachment {
  type: "image" | "file";
  url: string;
  name: string;
}
```

---

## 移行チェックリスト

### API利用者向け

- [ ] 変更ログを定期的に確認
- [ ] 非推奨警告に対応
- [ ] 移行期間内に新形式へ移行
- [ ] エラーハンドリングの更新

### API開発者向け

- [ ] 破壊的変更は必ず非推奨期間を設定
- [ ] 変更ログを即座に更新
- [ ] クライアントコードに非推奨警告を追加
- [ ] 移行ガイドを提供

---

## 関連ドキュメント

| 項目 | 参照先 |
|-----|--------|
| API仕様詳細 | [./api-specification.md](./api-specification.md) |
| エラーハンドリング | [./error-handling.md](./error-handling.md) |
| 変更履歴（全体） | [./change-history.md](./change-history.md) |
