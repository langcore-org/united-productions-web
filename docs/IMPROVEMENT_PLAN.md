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

### 詳細な変更内容

#### 1. next.config.ts の修正

**変更前:**
```typescript
typescript: {
  ignoreBuildErrors: true,
}
```

**変更後:**
```typescript
typescript: {
  ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === "true",
},
eslint: {
  ignoreDuringBuilds: process.env.SKIP_LINT === "true",
}
```

- 本番デプロイ時に型エラーを検出できるように変更
- 環境変数でオプトアウト可能に

#### 2. StreamingMessage.tsx の修正

**修正内容:**
- 未使用の `setState` を削除
- 無限ループの危険性がある `useEffect` を修正
- `memo` でコンポーネントをメモ化
- プロバイダー定数を `lib/llm/constants.ts` に移動
- 型安全性の向上（`UseLLMStreamReturn` インターフェース追加）

**改善後のインターフェース:**
```typescript
interface StreamingMessageProps {
  provider: LLMProvider;
  content?: string;      // 親から渡される
  thinking?: string;     // 親から渡される
  isComplete?: boolean;  // 親から渡される
  onComplete?: () => void;
  className?: string;
}
```

#### 3. Prisma接続プール設定

**変更内容:**
- ログ設定の追加（開発環境ではクエリログを出力）
- エラーハンドリングの強化（モッククライアントを廃止）
- 接続プールパラメータの環境変数対応（ドキュメントに記載）

**推奨 DATABASE_URL:**
```
postgresql://user:pass@host/db?connection_limit=5&pool_timeout=10
```

#### 4. API認証ユーティリティの作成

**新規作成ファイル:**
- `lib/api/auth.ts` - 認証関連ユーティリティ
- `lib/api/utils.ts` - API共通ユーティリティ

**提供機能:**
```typescript
// lib/api/auth.ts
requireAuth(req)      // 認証必須
optionalAuth(req)     // オプショナル認証
requireRole(req, roles) // ロールベース認証

// lib/api/utils.ts
handleApiError(error) // 統一エラーハンドリング
successResponse(data) // 成功レスポンス
LLMError             // カスタムエラークラス
```

#### 5. API Routesに認証追加

**修正対象ファイル（6ファイル）:**
- `app/api/transcripts/route.ts`
- `app/api/meeting-notes/route.ts`
- `app/api/schedules/route.ts`
- `app/api/research/route.ts`
- `app/api/llm/chat/route.ts`
- `app/api/llm/stream/route.ts`

**各ファイルでの共通パターン:**
```typescript
export async function POST(request: NextRequest) {
  // 認証チェック
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  // ... 以降の処理
}
```

**追加の改善:**
- Zodスキーマによるバリデーション強化（research/route.ts）
- エラーハンドリングを `handleApiError` に統一
- エラーメッセージを日本語に統一

---

## 🔄 残りの改善項目（中・低優先度）

### 🟡 中優先度

| # | 項目 | 対象ファイル | 推定工数 |
|---|------|-------------|---------|
| 6 | ResearchChat.tsxのコンポーネント分割 | `components/research/ResearchChat.tsx` | 2日 |
| 7 | Reactコンポーネントのメモ化 | `components/ui/*.tsx` | 1日 |
| 8 | Prismaクエリの最適化（N+1解消） | `lib/prisma.ts` 使用箇所 | 1日 |
| 9 | セグメント別loading.tsx・error.tsxの作成 | `app/**/loading.tsx` | 1日 |
| 10 | LLMクライアントのリファクタリング | `lib/llm/clients/*.ts` | 2日 |

### 🟢 低優先度

| # | 項目 | 対象ファイル | 推定工数 |
|---|------|-------------|---------|
| 11 | プロンプトの外部化 | `prompts/*.ts` → `prompts/*.md` | 1日 |
| 12 | Server/Client Componentsの再設計 | `app/**/*.tsx` | 3日 |
| 13 | ルートグループによる認証分離 | `app/(authenticated)/*` | 1日 |
| 14 | Prismaスキーマのインデックス最適化 | `prisma/schema.prisma` | 0.5日 |
| 15 | テスト整備 | `tests/**/*.spec.ts` | 3日 |

---

## 📋 各改善項目の詳細

### 6. ResearchChat.tsxのコンポーネント分割

**現状:** 934行の巨大コンポーネント

**目標構造:**
```
components/research/
├── ResearchChat.tsx          # メインコンポーネント（200行程度）
├── EmptyState.tsx            # 空状態表示
├── ChatMessage.tsx           # メッセージ表示（メモ化）
├── StreamingMessageBubble.tsx # ストリーミング表示
└── hooks/
    └── useResearchChat.ts    # ロジック抽出
```

### 7. Reactコンポーネントのメモ化

**対象コンポーネント:**
- `LLMSelector.tsx` - `providers`, `groupedProviders` のメモ化
- `MessageBubble.tsx` - コンポーネントメモ化
- `FileUpload.tsx` - `validateFile`, `createPreview` のメモ化
- `Sidebar.tsx` - `navItems` のメモ化

### 8. Prismaクエリの最適化

**N+1問題の解消:**
```typescript
// 改善前
for (const id of ids) {
  await prisma.meetingNote.findUnique({ where: { id } });
}

// 改善後
await prisma.meetingNote.findMany({
  where: { id: { in: ids } },
});
```

### 9. セグメント別loading.tsx・error.tsx

**作成対象:**
```
app/
├── chat/
│   ├── loading.tsx      # チャット用スケルトン
│   └── error.tsx        # チャット用エラーバウンダリ
├── transcripts/
│   ├── loading.tsx      # 起こし機能用スケルトン
│   └── error.tsx
├── schedules/
│   ├── loading.tsx      # スケジュール用スケルトン
│   └── error.tsx
└── research/
    ├── loading.tsx      # リサーチ用スケルトン
    └── error.tsx
```

### 10. LLMクライアントのリファクタリング

**改善内容:**
- 共通処理を `BaseLLMClient` に抽出
- エラーハンドリングの統一（`LLMError` クラス使用）
- リトライロジックの追加（指数バックオフ）
- コスト計算を `config.ts` の `calculateCost` に統一

### 11. プロンプトの外部化

**目標構造:**
```
prompts/
├── meeting/
│   ├── default.md
│   └── interview.md
├── schedule/
│   └── generate.md
├── transcript/
│   └── format.md
└── research/
    ├── people.md
    ├── evidence.md
    └── location.md
```

### 12. Server/Client Componentsの再設計

**変更方針:**
- データフェッチングを Server Component で行う
- インタラクティブ部分のみ Client Component に分離
- `page.tsx` を Server Component 化

### 13. ルートグループによる認証分離

**目標構造:**
```
app/
├── (authenticated)/      # ログイン必須ページ
│   ├── chat/
│   ├── transcripts/
│   ├── schedules/
│   ├── research/
│   ├── meeting-notes/
│   └── settings/
├── (public)/             # 公開ページ
│   ├── auth/
│   └── preview-login/
└── layout.tsx
```

### 14. Prismaスキーマのインデックス最適化

**変更内容:**
```prisma
// 重複インデックスの削除
model User {
  // @@index([email])    // ← @unique と重複のため削除
  // @@index([googleId]) // ← @unique と重複のため削除
}

// 複合インデックスの追加
model MeetingNote {
  @@index([userId, status, createdAt])
}

model UsageLog {
  @@index([userId, provider, createdAt])
  @@index([createdAt, cost])
}
```

### 15. テスト整備

**追加予定のテスト:**
- API Routes のユニットテスト
- コンポーネントの単体テスト
- E2Eテストの拡充

---

## 🚀 推奨される次のステップ

### 即座に取り組むべき項目（今週）

1. **ResearchChat.tsxの分割**
   - 影響範囲が限定的で、保守性向上の効果が大きい
   - 他のコンポーネントのリファクタリングの参考になる

2. **セグメント別loading.tsx・error.tsxの作成**
   - UX向上に直結
   - 実装が比較的簡単

### 中期的に取り組むべき項目（来月）

1. **LLMクライアントのリファクタリング**
   - エラーハンドリングの統一
   - 新規プロバイダー追加時の工数削減

2. **Prismaスキーマの最適化**
   - クエリパフォーマンスの向上
   - インデックスの見直し

### 長期的に取り組むべき項目（今 quarter）

1. **Server/Client Componentsの再設計**
   - パフォーマンス最適化
   - 初期ロード時間の短縮

2. **テスト整備**
   - 品質保証
   - リグレッション防止

---

## 📊 メトリクスと監視

### 導入を推奨するツール

1. **パフォーマンス監視**
   - Vercel Analytics
   - Lighthouse CI

2. **エラー監視**
   - Sentry
   - LogRocket

3. **メトリクス収集**
   - トークン使用量
   - APIレイテンシ
   - エラーレート

---

## 📝 変更履歴

| 日付 | 変更内容 | 担当 |
|------|---------|------|
| 2026-02-19 | クリティカル優先度項目の対応 | AI Assistant |
| | - next.config.ts修正 | |
| | - StreamingMessage.tsx修正 | |
| | - Prisma接続プール設定 | |
| | - API認証ユーティリティ作成 | |
| | - 6つのAPI Routeに認証追加 | |

---

*最終更新日: 2026-02-19*
