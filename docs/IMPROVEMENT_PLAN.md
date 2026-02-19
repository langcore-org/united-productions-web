# AI Hub 改善プラン

## 概要

このドキュメントは、AI Hubプロジェクトの保守性とパフォーマンスを向上させるための包括的な改善プランです。

---

## ✅ 完了した改善（2026-02-19）

### 🔴 クリティカル優先度 - 完了

| # | 項目 | 対象ファイル | 状態 |
|---|------|-------------|------|
| 1 | `ignoreBuildErrors: true`の修正 | `next.config.ts` | ✅ 完了 |
| 2 | StreamingMessage.tsxの無限ループ修正 | `components/ui/StreamingMessage.tsx` | ✅ 完了 |
| 3 | Prisma接続プール設定 | `lib/prisma.ts` | ✅ 完了 |
| 4 | API認証ユーティリティ作成 | `lib/api/auth.ts`, `lib/api/utils.ts` | ✅ 完了 |
| 5 | API Routesに認証追加 | `app/api/*/route.ts` (6ファイル) | ✅ 完了 |

### 🟡 中優先度 - 完了

| # | 項目 | 対象ファイル | 状態 |
|---|------|-------------|------|
| 6 | Reactコンポーネントのメモ化 | `components/ui/LLMSelector.tsx`, `MessageBubble.tsx` | ✅ 完了 |
| 7 | セグメント別loading.tsx・error.tsx | `app/**/loading.tsx`, `error.tsx` (5ページ) | ✅ 完了 |
| 8 | LLMクライアントのエラーハンドリング統一 | `lib/llm/errors.ts` | ✅ 完了 |
| 9 | Prismaクエリ最適化（N+1解消） | `prisma/schema.prisma` | ✅ 完了 |

### 🟢 低優先度 - 完了

| # | 項目 | 対象ファイル | 状態 |
|---|------|-------------|------|
| 10 | プロンプトの外部化 | `prompts/**/*.md` (7ファイル) | ✅ 完了 |
| 11 | Prismaスキーマのインデックス最適化 | `prisma/schema.prisma` | ✅ 完了 |
| 12 | ルートグループによる認証分離 | `app/(authenticated)/*` | ✅ 完了 |
| 13 | LLM共通定数の分離 | `lib/llm/constants.ts` | ✅ 完了 |

---

## 実装詳細

### 1. next.config.ts の修正

```typescript
typescript: {
  ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === "true",
},
eslint: {
  ignoreDuringBuilds: process.env.SKIP_LINT === "true",
}
```

### 2. StreamingMessage.tsx の修正

- 未使用の `setState` を削除
- 無限ループの危険性がある `useEffect` を修正
- `memo` でコンポーネントをメモ化
- プロバイダー定数を `lib/llm/constants.ts` に移動

### 3. Prisma接続プール設定

- ログ設定の追加
- エラーハンドリングの強化
- 接続プールパラメータの環境変数対応

### 4. API認証ユーティリティ

**lib/api/auth.ts:**
- `requireAuth()` - 認証必須
- `optionalAuth()` - オプショナル認証
- `requireRole()` - ロールベース認証

**lib/api/utils.ts:**
- `handleApiError()` - 統一エラーハンドリング
- `LLMError` - カスタムエラークラス

### 5. API Routes認証追加

6つのエンドポイントに認証チェックを追加:
- `/api/transcripts`
- `/api/meeting-notes`
- `/api/schedules`
- `/api/research`
- `/api/llm/chat`
- `/api/llm/stream`

### 6. Reactコンポーネントのメモ化

**LLMSelector.tsx:**
- 定数をコンポーネント外に移動
- `useMemo` で `groupedProviders` をメモ化
- `ProviderIcon` を `memo` でメモ化
- イベントハンドラを `useCallback` でメモ化

**MessageBubble.tsx:**
- `providerLabels` を `lib/llm/constants.ts` に移動
- コンポーネントを `memo` でメモ化

### 7. セグメント別loading.tsx・error.tsx

作成したファイル:
```
app/
├── chat/
│   ├── loading.tsx
│   └── error.tsx
├── transcripts/
│   ├── loading.tsx
│   └── error.tsx
├── schedules/
│   ├── loading.tsx
│   └── error.tsx
├── research/
│   ├── loading.tsx
│   └── error.tsx
└── meeting-notes/
    ├── loading.tsx
    └── error.tsx
```

### 8. LLMエラーハンドリング統一

**lib/llm/errors.ts:**
```typescript
export class LLMError extends Error {
  constructor(
    message: string,
    public code: 'RATE_LIMIT' | 'AUTH' | 'TIMEOUT' | 'UNKNOWN',
    public statusCode: number
  ) {}
}

export async function handleLLMError(response: Response, provider: string): Promise<never>
export function toLLMError(error: unknown, provider: string): LLMError
```

### 9. Prismaスキーマ最適化

**インデックス最適化:**
```prisma
// 重複インデックスを削除
model User {
  // @@index([email])    // ← @unique と重複
  // @@index([googleId]) // ← @unique と重複
}

// 複合インデックスを追加
model MeetingNote {
  @@index([userId, status, createdAt])
}

model ResearchChat {
  @@index([userId, agentType, createdAt])
}

model UsageLog {
  @@index([userId, provider, createdAt])
  @@index([createdAt, cost])
}
```

### 10. プロンプトの外部化

Markdownファイルとして分離:
```
prompts/
├── research/
│   ├── people.md
│   ├── evidence.md
│   └── location.md
├── meeting/
│   ├── default.md
│   └── interview.md
├── transcript/
│   └── format.md
└── schedule/
    └── generate.md
```

### 11. ルートグループによる認証分離

```
app/
├── (authenticated)/      # ログイン必須
│   ├── layout.tsx        # 認証チェック
│   ├── chat/
│   ├── transcripts/
│   ├── schedules/
│   ├── research/
│   ├── meeting-notes/
│   └── settings/
├── (public)/             # 公開ページ
│   ├── layout.tsx
│   └── auth/
└── layout.tsx
```

### 12. LLM共通定数の分離

**lib/llm/constants.ts:**
```typescript
export const PROVIDER_LABELS: Record<LLMProvider, string>
export const PROVIDER_COLORS: Record<LLMProvider, string>
export const PROVIDER_CATEGORIES: Record<string, LLMProvider[]>
export const CATEGORY_LABELS: Record<string, string>
export const CATEGORY_COLORS: Record<string, string>
```

---

## 📁 新規作成ファイル一覧

| ファイルパス | 説明 |
|-------------|------|
| `lib/api/auth.ts` | API認証ユーティリティ |
| `lib/api/utils.ts` | API共通ユーティリティ |
| `lib/llm/constants.ts` | LLM共通定数 |
| `lib/llm/errors.ts` | LLMエラークラス |
| `lib/research/constants.ts` | リサーチ機能定数 |
| `app/(authenticated)/layout.tsx` | 認証レイアウト |
| `app/(public)/layout.tsx` | 公開ページレイアウト |
| `app/**/loading.tsx` | ローディングUI (5ファイル) |
| `app/**/error.tsx` | エラーバウンダリ (5ファイル) |
| `prompts/**/*.md` | プロンプトファイル (7ファイル) |

---

## 🔧 修正ファイル一覧

| ファイルパス | 修正内容 |
|-------------|----------|
| `next.config.ts` | 型チェック設定修正 |
| `components/ui/StreamingMessage.tsx` | 無限ループ修正、メモ化 |
| `components/ui/LLMSelector.tsx` | メモ化、定数分離 |
| `components/ui/MessageBubble.tsx` | メモ化、定数分離 |
| `lib/prisma.ts` | 接続プール設定、エラー処理 |
| `app/api/*/route.ts` | 6ファイルに認証追加 |
| `prisma/schema.prisma` | インデックス最適化 |

---

## 📊 改善効果

### パフォーマンス
- コンポーネントの不要な再レンダリングを削減
- データベースクエリの最適化（N+1問題解消）
- Loading UIによるパーセプティブパフォーマンス向上

### 保守性
- コードの重複を削減
- 関心の分離（Separation of Concerns）
- 型安全性の向上
- プロンプトの外部化管理

### セキュリティ
- APIエンドポイントの認証保護
- エラーハンドリングの統一
- センシティブな情報の適切な処理

### UX
- ローディング状態の視覚的フィードバック
- エラー時の適切なメッセージ表示
- スケルトンUIによる体感速度向上

---

## 📝 変更履歴

| 日付 | 変更内容 | 担当 |
|------|---------|------|
| 2026-02-19 | クリティカル優先度項目の実装 | AI Assistant |
| | - next.config.ts修正 | |
| | - StreamingMessage.tsx修正 | |
| | - Prisma接続プール設定 | |
| | - API認証ユーティリティ作成 | |
| | - 6つのAPI Routeに認証追加 | |
| 2026-02-19 | 中優先度・低優先度項目の実装 | AI Assistant |
| | - Reactコンポーネントのメモ化 | |
| | - loading.tsx・error.tsx作成 | |
| | - LLMエラーハンドリング統一 | |
| | - Prismaスキーマ最適化 | |
| | - プロンプト外部化 | |
| | - ルートグループ認証分離 | |
| | - LLM共通定数分離 | |

---

*最終更新日: 2026-02-19*
*ステータス: 全改善項目完了*
