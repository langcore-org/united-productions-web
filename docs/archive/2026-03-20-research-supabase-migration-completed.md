# Supabase移行検討: Prisma + Neon + NextAuth から Supabase へ

> **発行日**: 2026-03-08  
> **最終更新**: 2026-03-20  
> **状態**: ✅ **完了（アーカイブ済み）**  
> **優先度**: 🔍 検討中 → ✅ 完了  
> **関連**: `prisma/schema.prisma`, `lib/auth-options.ts`, `lib/prisma.ts`

---

## 🎉 完了報告

**2026-03-20: Supabase Auth + Supabase DBへの移行が完了しました。**

このドキュメントは参考資料としてアーカイブされています。

---

## 概要

現在の技術スタック（Prisma ORM + Neon PostgreSQL + NextAuth.js）を Supabase エコシステムに移行する場合のメリット・デメリットを検討する。

### 重要: 現在の状況（2026-03-08）

| 項目 | 現在の状況 |
|------|-----------|
| **環境** | 浅野個人の開発環境（Neon Free Tier） |
| **DB URL** | `ep-plain-grass-a10993pu-pooler.ap-southeast-1.aws.neon.tech` |
| **本番環境** | **未構築** - 新規作成が必要 |

**【完了】2026-03-20: Supabase Auth + Supabase DBへの移行が完了しました。**

**本番用データベースを新規作成する必要があるため、「移行」ではなく「新規構築時の選択」として検討する。**

---

## 選択肢の整理

本番環境用データベースを新規作成する際の選択肢：

### 選択肢1: Neon継続（新規プロジェクト作成）
新しいNeonプロジェクトを作成し、現在の構成を維持

### 選択肢2: Supabase完全移行
SupabaseにAuth・DBともに移行

### 選択肢3: Supabase DBのみ（Prisma維持）
Supabase PostgreSQLをPrisma経由で使用

### 選択肢4: 別のPostgreSQLホスティング
AWS RDS、Google Cloud SQL等

### 現在のアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js App                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ NextAuth.js  │  │   Prisma     │  │ Google OAuth API │  │
│  │   (Auth)     │  │    (ORM)     │  │  (Drive連携)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
└─────────┼─────────────────┼─────────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  NextAuth DB    │  │  Neon Postgres  │
│  (Sessions等)   │  │  (主要データ)   │
└─────────────────┘  └─────────────────┘
```

### Supabase 移行後の候補アーキテクチャ

移行範囲により3パターンが考えられる：

#### パターンA: 完全移行（Supabaseエコシステム完全採用）

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js App                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │Supabase Auth │  │Supabase Client│  │ Google OAuth API │  │
│  │   (Auth)     │  │   (DB操作)   │  │  (Drive連携)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
└─────────┼─────────────────┼─────────────────────────────────┘
          │                 │
          ▼                 ▼
        ┌─────────────────────────────────────┐
        │        Supabase Platform            │
        │  ┌──────────┬──────────────────┐   │
        │  │   Auth   │   PostgreSQL     │   │
        │  └──────────┴──────────────────┘   │
        └─────────────────────────────────────┘
```

#### パターンB: データベースのみ移行（Prisma継続使用）

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js App                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ NextAuth.js  │  │   Prisma     │  │ Google OAuth API │  │
│  │   (Auth)     │  │    (ORM)     │  │  (Drive連携)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
└─────────┼─────────────────┼─────────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  NextAuth DB    │  │ Supabase Postgres│
│  (Sessions等)   │  │  (主要データ)   │
└─────────────────┘  └─────────────────┘
```

#### パターンC: ハイブリッド（Supabase Auth + Prisma）

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js App                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │Supabase Auth │  │   Prisma     │  │ Google OAuth API │  │
│  │   (Auth)     │  │    (ORM)     │  │  (Drive連携)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
└─────────┼─────────────────┼─────────────────────────────────┘
          │                 │
          ▼                 ▼
        ┌─────────────────────────────────────┐
        │        Supabase Platform            │
        │  ┌──────────┬──────────────────┐   │
        │  │   Auth   │   PostgreSQL     │   │
        │  └──────────┴──────────────────┘   │
        └─────────────────────────────────────┘
```

---

## 各パターンのメリット・デメリット

### パターンA: 完全移行

#### メリット

| 項目 | 説明 |
|------|------|
| **統一されたエコシステム** | Auth・DB・Storage・Realtimeが1つのプラットフォームで管理 |
| **クライアントサイドDBアクセス** | RLS（Row Level Security）で安全にブラウザから直接DBアクセス可能 |
| **リアルタイム機能** | リアルタイムサブスクリプションが標準搭載（チャット機能等に活用可能） |
| **認証・認可の統合** | AuthとRLSの連携で、認可ロジックをDB層に集約可能 |
| **バックアップ・管理画面** | Supabase Dashboardによるデータ管理・バックアップ操作が容易 |
| **Edge Functions** | Vercel Edge Functionsの代替として使用可能 |
| **コスト最適化の可能性** | 小〜中規模では無料枠が充実（500MB DB, 1GB帯域/月） |

#### デメリット

| 項目 | 説明 | 影響度 |
|------|------|--------|
| **大規模なコード変更** | PrismaからSupabase Clientへの移行で、全DB操作コードを書き換え必要 | 🔴 高 |
| **型安全性の低下** | Prismaの自動生成型が失われ、手動で型定義が必要 | 🔴 高 |
| **マイグレーション管理の変更** | Prisma Migrate → Supabase CLIまたは手動マイグレーション | 🟡 中 |
| **複雑なクエリの可読性** | Prismaの直感的なAPIからSQLライクな記述に変更 | 🟡 中 |
| **Google Drive連携の再実装** | NextAuthの`access_token`取得ロジックを再実装必要 | 🟡 中 |
| **ベンダーロックイン** | Supabase固有の機能（RLS, Edge Functions等）への依存 | 🟡 中 |
| **Connection Pooling** | SupabaseのPgBouncer設定に依存（PrismaのConnection Poolと異なる） | 🟢 低 |

#### 工数見積もり

- スキーマ移行（テーブル定義・RLSポリシー作成）: 8-12時間
- DB操作コードの移行（Prisma → Supabase Client）: 40-60時間
- 認証システム移行（NextAuth → Supabase Auth）: 16-24時間
- Google Drive連携の再実装: 8-12時間
- テスト・デバッグ: 16-24時間
- **合計: 88-132時間（約2-3週間）**

---

### パターンB: データベースのみ移行（Prisma継続使用）

#### メリット

| 項目 | 説明 |
|------|------|
| **最小限のコード変更** | DB接続URL変更のみで、Prismaを継続使用可能 |
| **既存コードの完全互換** | 全DB操作コードを変更せずに移行可能 |
| **型安全性の維持** | Prismaの型生成機能を引き続き使用可能 |
| **認証システムの維持** | NextAuth.jsの設定変更なし |
| **段階的な移行が可能** | まずDBだけ移行し、後からAuth等を検討可能 |
| **マイグレーション管理の継続** | Prisma Migrateを引き続き使用可能 |

#### デメリット

| 項目 | 説明 | 影響度 |
|------|------|--------|
| **Supabase機能の制限** | RLS、Realtime、Edge Functions等はPrisma経由では利用困難 | 🟡 中 |
| **Connection Pooling設定** | PrismaとSupabase PgBouncerの設定調整が必要 | 🟢 低 |
| **Dashboard機能の制限** | Prisma経由で作成したテーブルのRLS設定等は手動管理 | 🟢 低 |
| **コストメリットが限定的** | Supabaseの付加価値機能を活かせない | 🟢 低 |

#### 工数見積もり

- Supabaseプロジェクト作成・設定: 2時間
- Connection Pooling設定調整: 2-4時間
- データ移行（dump/restore）: 4-8時間
- 環境変数変更・動作確認: 2時間
- **合計: 10-16時間（約1.5-2日）**

---

### パターンC: ハイブリッド（Supabase Auth + Prisma）

#### メリット

| 項目 | 説明 |
|------|------|
| **認証の簡素化** | Supabase Authの組み込み機能（パスワードリセット、メール確認等） |
| **Prisma型安全性の維持** | DB操作コードは変更なし |
| **Google OAuth連携の簡略化** | Supabase Auth Providerで設定が簡単 |
| **RLSの活用可能性** | Supabase AuthのJWTをRLSと連携可能（設定が必要） |

#### デメリット

| 項目 | 説明 | 影響度 |
|------|------|--------|
| **Google Drive連携の複雑化** | Supabase AuthからGoogle `access_token`取得は非自明 | 🔴 高 |
| **2つのクライアントの管理** | Supabase Client（Auth用）とPrisma Client（DB用）の混在 | 🟡 中 |
| **セッション管理の複雑化** | NextAuthのJWT戦略からSupabase Authのセッション管理への移行 | 🟡 中 |
| **認証フローの再設計** | ミドルウェア、セッション取得ロジックの全面的な変更 | 🔴 高 |

#### 工数見積もり

- Supabase Auth設定: 4-6時間
- 認証フロー移行（NextAuth → Supabase Auth）: 24-32時間
- Google Drive連携の再設計: 12-16時間
- ミドルウェア・セッション管理の変更: 8-12時間
- テスト・デバッグ: 8-12時間
- **合計: 56-78時間（約1-1.5週間）**

---

## 現在のシステム構成との詳細比較

### データベーススキーマの互換性

現在のスキーマ（`prisma/schema.prisma`）は357行で、以下を含む：

- **NextAuth関連テーブル**: `Account`, `Session`, `VerificationToken`, `User`
- **アプリケーションテーブル**: `MeetingNote`, `Transcript`, `ResearchChat`, `ResearchMessage` ~~`LocationSchedule`~~（削除済み）
- **システムテーブル**: `UsageLog`, `ProgramSettings`, `GrokToolSettings`, `AppLog`, `SystemSettings`, `SystemPrompt`, `SystemPromptVersion`, `FeaturePrompt`
- **Enum定義**: `LLMProvider`, `LogLevel`, `LogCategory`

#### 移行時の考慮事項

| 項目 | Prisma + Neon | Supabase |
|------|---------------|----------|
| **Enum型** | Prismaスキーマで定義 | PostgreSQLのEnum型またはCHECK制約 |
| **JSON型** | `Json` 型サポート | `jsonb` 型サポート |
| **インデックス** | `@@index` で定義 | SQLまたはマイグレーションで定義 |
| **リレーション** | Prismaレベルで管理 | PostgreSQLのFK制約 |
| **RLS** | なし | 手動でポリシー定義が必要 |

### 認証システムの比較

| 機能 | NextAuth.js + Prisma Adapter | Supabase Auth |
|------|------------------------------|---------------|
| **Google OAuth** | ✅ 標準サポート | ✅ 標準サポート |
| **JWT戦略** | ✅ サポート | ✅ サポート |
| **データベースセッション** | ✅ Prismaテーブル使用 | ✅ Supabase管理 |
| **Credentials Provider** | ✅ カスタム実装可能 | ✅ 標準サポート |
| **Google Drive連携** | ✅ `access_token`取得容易 | ⚠️ 追加実装必要 |
| **ロール管理** | ✅ DB連携可能 | ✅ `app_metadata`で管理 |
| **E2Eテスト用認証** | ✅ Preview Credentials | ✅ テスト用メール/パスワード |

### Google Drive連携の重要な考慮事項

現在のシステムは `access_token` と `refresh_token` を使用してGoogle Drive APIにアクセス：

```typescript
// lib/auth-options.ts の現在の実装
authorization: {
  params: {
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.file",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
  },
},
```

**NextAuth.jsの場合**: `account.access_token` と `account.refresh_token` をJWTに保存し、Google Drive API呼び出し時に使用。

**Supabase Authの場合**: Google Providerを使用しても、`provider_tokens` からアクセストークンを取得する必要があり、追加の実装が必要：

```typescript
// Supabase AuthでGoogle Drive連携する場合
const { data: { session } } = await supabase.auth.getSession()
const providerToken = session?.provider_token // Google access_token
```

---

## 推奨方針（本番環境新規構築）

### 結論: **Supabase を推奨** ✅ → **移行完了** ✅

**2026-03-20更新**: Neon + NextAuth.js から Supabase（Auth + DB）への移行が完了しました。

**理由**:

1. **新規構築ならSupabaseが有利**: 「移行コスト」がないため、Supabaseのメリットを最大限活かせる
2. **管理・運用の容易さ**: DashboardによるGUI管理、バックアップ、監視機能が充実
3. **コスト効率**: Neon Free Tier（500MB）と同等の無料枠（500MB）+ 認証・Storage等の追加機能付き
4. **将来の拡張性**: Realtime、Edge Functions等の追加機能が必要になった場合にすぐ活用可能

### 推奨構成: 選択肢3「Supabase DBのみ（Prisma維持）」

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js App（本番環境）                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ NextAuth.js  │  │   Prisma     │  │ Google OAuth API │  │
│  │   (Auth)     │  │    (ORM)     │  │  (Drive連携)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
└─────────┼─────────────────┼─────────────────────────────────┘
          │                 │
          ▼                 ▼
        ┌─────────────────────────────────────┐
        │     Supabase Platform（本番）        │
        │  ┌──────────┬──────────────────┐   │
        │  │   Auth   │   PostgreSQL     │   │  ※DBのみ使用
        │  │ (未使用)  │  (Prisma経由)    │   │
        │  └──────────┴──────────────────┘   │
        └─────────────────────────────────────┘
```

**この構成のメリット**:
- Google Drive連携がそのまま維持（NextAuthの`access_token`取得）
- Prismaの型安全性を完全に維持
- 将来のAuth移行も段階的に可能
- 最小限のコード変更（DB接続URL変更のみ）

### 代替案: Neon継続

Supabaseを使わない理由があれば、Neon新規プロジェクト作成でも問題なし：
- 既存コードの完全互換
- 設定・手順が確立済み
- コスト構造が理解しやすい

---

## 本番環境構築手順（Supabase選択時）

### フェーズ1: Supabaseプロジェクト作成（2時間）

1. Supabaseダッシュボードで新規プロジェクト作成
2. データベース接続情報（Connection Pooler URL）を取得
3. 環境変数設定（Vercel本番環境）

### フェーズ2: スキーマ移行（4-8時間）

```bash
# 現在のNeonからスキーマダンプ
pg_dump --schema-only $DATABASE_URL > schema.sql

# Supabaseに適用（必要に応じて調整）
psql $SUPABASE_DATABASE_URL < schema.sql

# Prismaマイグレーション履歴は手動で再作成
```

### フェーズ3: 動作確認・テスト（4時間）

- 認証フロー確認
- DB操作確認
- Google Drive連携確認

### フェーズ4: データ移行（必要に応じて）

```bash
# データ移行が必要な場合
pg_dump --data-only $DATABASE_URL > data.sql
psql $SUPABASE_DATABASE_URL < data.sql
```

**総工数: 10-14時間（約1.5-2日）**

---

## コスト比較（本番環境）

| サービス | 無料枠 | Proプラン | 備考 |
|---------|--------|----------|------|
| **Neon** | 500MB, 190 compute hours | $19/月 | 現状維持 |
| **Supabase** | 500MB, 2GB帯域 | $25/月 | Auth・Storage等含む |
| **Upstash Redis** | 10,000コマンド/日 | $10/月 | キャッシュ用 |

**注意**: Supabaseに移行しても、Redisキャッシュは別途必要な可能性あり（Upstash継続）

---

## 従来の推奨（移行の場合）

### 移行を検討すべきタイミング（参考）

以下の条件が満たされた場合に再検討：

- [ ] **リアルタイム機能が必須に**: チャットのリアルタイム更新等が必要になった場合
- [ ] **Google Drive連携が不要に**: Drive API連携を廃止する場合
- [ ] **コスト圧力**: Neon + Upstash Redisのコストが問題になる場合

### 移行する場合の推奨パターン

移行が決定した場合は **パターンB（データベースのみ移行）** を推奨：

- 最小限の変更で移行可能
- Prismaの型安全性を維持
- 段階的に他の機能も移行可能

---

## 環境変数設定例（本番用）

### 現在の開発環境（Neon Free Tier）
```bash
# .env.local（開発環境）
DATABASE_URL=postgresql://neondb_owner:xxx@ep-plain-grass-a10993pu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

### Supabase本番環境
```bash
# Vercel本番環境変数
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?pgbouncer=true&connection_limit=10
# またはConnection Pooler URL
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# 既存の設定は維持
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=https://[your-domain].vercel.app
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

---

## 参考リンク

- [Supabase Pricing](https://supabase.com/pricing)
- [Prisma + Supabase Guide](https://www.prisma.io/docs/orm/overview/databases/supabase)
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
- [NextAuth.js Documentation](https://next-auth.js.org/)

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-03-08 | 初版作成 |
| 2026-03-20 | 移行完了を反映 |

---

## 関連ドキュメント

- [Backlog README](./README.md) - Backlog管理ガイド
- [AGENTS.md](../../AGENTS.md) - エージェント行動指針
- [Supabase Documentation](https://supabase.com/docs) - Supabase公式ドキュメント

---

**最終更新**: 2026-03-20 14:35
