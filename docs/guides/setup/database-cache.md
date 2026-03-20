# Supabase 設定手順

`.env.local` の Supabase 関連環境変数を設定するための手順です。

---

## 1. Supabase プロジェクトの作成

### 1.1 アカウントとプロジェクト作成

1. [Supabase](https://supabase.com/) にアクセスし、**Sign up**（GitHub などでログイン可）
2. **New project** でプロジェクトを作成
3. 以下を設定：
   - **Organization**: 既存の組織または新規作成
   - **Project name**: 任意（例: `ai-hub-production`）
   - **Database Password**: 強力なパスワードを設定（後で変更不可）
   - **Region**: `Northeast Asia (Tokyo)` を選択
   - **Pricing plan**: Free Tier または Pro

### 1.2 環境変数の取得

プロジェクト作成後、**Project Settings** → **API** で以下を取得：

| 環境変数 | 取得場所 | 説明 |
|---------|---------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | プロジェクトのURL（`https://xxxx.supabase.co`） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project API Keys → `anon` `public` | 公開可能な匿名キー |
| `SUPABASE_SERVICE_ROLE_KEY` | Project API Keys → `service_role` `secret` | **秘匿** 管理用キー |

⚠️ **重要**: `SUPABASE_SERVICE_ROLE_KEY`は絶対に公開しないでください（サーバーサイドのみ使用）

---

## 2. Google OAuth の設定（Supabase Auth）

### 2.1 Google Cloud Console での設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
3. **Application type**: Web application
4. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```
5. **Authorized redirect URIs**:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
6. **Create** → クライアントIDとシークレットをコピー

### 2.2 Supabase Auth での設定

1. Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. **Client ID** と **Client Secret** を入力
3. **Save**

---

## 3. .env.local に反映

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Google OAuth（Supabase Auth連携）
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

---

## 4. データベースマイグレーション

### 4.1 Supabase CLI のインストール

```bash
npm install -g supabase
```

### 4.2 プロジェクトのリンク

```bash
supabase login
supabase link --project-ref <project-ref>
# project-ref: Project Settings → General → Reference ID
```

### 4.3 マイグレーションの実行

```bash
# 既存のマイグレーションを適用
supabase db push

# マイグレーション状態の確認
supabase migration list
```

---

## 5. 設定後の確認

1. `.env.local` を保存
2. 開発サーバーを再起動: `npm run dev`
3. 以下の機能が動作するか確認：
   - ログイン（Google OAuth）
   - チャット履歴の保存・読み込み
   - プロンプトの取得

---

## 6. トラブルシューティング

### RLS ポリシーエラー

```
new row violates row-level security policy for table "chats"
```

**原因**: ユーザー認証が正しく行われていない
**対応**: 
- ミドルウェア（`lib/supabase/middleware.ts`）が正しく設定されているか確認
- セッションが有効か確認（`lib/supabase/server.ts`）

### マイグレーションエラー

```bash
# マイグレーションをリセット（開発環境のみ）
supabase db reset

# 特定のマイグレーションまでロールバック
supabase db rollback
```

---

## リンク

| サービス | コンソール / ドキュメント |
|----------|---------------------------|
| Supabase | [Dashboard](https://supabase.com/dashboard) / [Docs](https://supabase.com/docs) |
| Supabase Auth | [Auth Docs](https://supabase.com/docs/guides/auth) |
| Google Cloud Console | [Console](https://console.cloud.google.com/apis/credentials) |

---

## 関連ドキュメント

- [Guides README](../README.md) - ガイド一覧
- [google-oauth-setup.md](./google-oauth-setup.md) - OAuth設定
- [vercel-authentication.md](./vercel-authentication.md) - Vercel認証設定
- [AGENTS.md](../../../AGENTS.md) - エージェント行動指針

---

**最終更新**: 2026-03-20 14:35
