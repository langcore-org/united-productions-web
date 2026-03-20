# 認証・認可仕様

> **Supabase Auth による認証体系**
> 
> **最終更新**: 2026-03-20 14:35

---

## 概要

| 項目 | 内容 |
|------|------|
| **フレームワーク** | Supabase Auth |
| **プロバイダー** | Google OAuth 2.0 (Workspace SSO対応) |
| **セッション管理** | Cookieベース（Supabase自動管理） |
| **クライアント** | `@supabase/ssr` |
| **ミドルウェア** | `lib/supabase/middleware.ts` |

---

## 認証フロー

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐
│  ユーザー  │ ──→ │  Supabase Auth │ ──→ │ Google OAuth │ ──→ │ 認可画面  │
└─────────┘     └─────────────┘     └─────────────┘     └─────────┘
                                              │
                                              ↓
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│ ダッシュボード │ ←── │  セッション確立  │ ←── │  コールバック  │
└─────────┘     └─────────────┘     └─────────────┘
```

---

## 設定

詳細は [guides/setup/google-oauth-setup.md](../guides/setup/google-oauth-setup.md) を参照。

### 環境変数

```bash
# 必須
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google OAuth（Supabase Authで設定）
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# アプリケーションURL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# オプション（Vercel環境）
# VERCEL_ENV=preview  # プレビュー環境判定用
```

---

## セッション仕様

| 項目 | 設定値 |
|-----|--------|
| 有効期限 | Supabaseデフォルト（自動管理） |
| 更新間隔 | 自動（Supabase SSRが処理） |
| 保存先 | Cookie（HTTPOnly, Secure） |
| セッショントークン | Supabase管理 |

---

## 認可（Authorization）

### ロールベースアクセス制御

| ロール | 説明 | アクセス範囲 |
|-------|------|-------------|
| `USER` | 一般ユーザー | 自分のデータのみ |
| `ADMIN` | 管理者 | 全データ + 管理機能 |

### ロール判定

```typescript
// サーバーサイドでのロール取得
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// ユーザーテーブルからロールを取得
const { data: profile } = await supabase
  .from("users")
  .select("role")
  .eq("id", user?.id)
  .single();

if (profile?.role === "ADMIN") {
  // 管理者機能へのアクセス許可
}
```

### 保護されたルート

```typescript
// middleware.ts
export const config = {
  matcher: [
    '/(authenticated)/:path*',  // 認証必須
    '/admin/:path*',             // 管理者のみ
  ],
};
```

---

## 関連ファイル

| ファイル | 説明 |
|---------|------|
| `middleware.ts` | 認証チェックミドルウェア |
| `app/auth/signin/page.tsx` | サインインページ |
| `app/auth/callback/route.ts` | OAuthコールバックハンドラー |
| `lib/supabase/middleware.ts` | Supabaseミドルウェアクライアント |
| `lib/supabase/server.ts` | サーバーサイドSupabaseクライアント |
| `lib/supabase/client.ts` | クライアントサイドSupabaseクライアント |

---

## 将来拡張

- 追加OAuthプロバイダー（Microsoft、GitHub等）
- 細粒度の権限管理（機能単位のアクセス制御）
- APIキー認証（外部連携用）

---

## 移行履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-03-20 | NextAuth.js から Supabase Auth へ移行 |
