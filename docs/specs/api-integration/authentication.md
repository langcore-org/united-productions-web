# 認証・認可仕様

> **NextAuth.js v4 による認証体系**
> 
> **最終更新**: 2026-02-22 00:17

---

## 概要

| 項目 | 内容 |
|------|------|
| **フレームワーク** | NextAuth.js v4.24.13 |
| **プロバイダー** | Google OAuth 2.0 (Workspace SSO対応) |
| **セッション管理** | JWT + Database ハイブリッド |
| **アダプター** | Prisma Adapter (`@auth/prisma-adapter`) |

---

## 認証フロー

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐
│  ユーザー  │ ──→ │  NextAuth.js │ ──→ │ Google OAuth │ ──→ │ 認可画面  │
└─────────┘     └─────────────┘     └─────────────┘     └─────────┘
                                              │
                                              ↓
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│ ダッシュボード │ ←── │   JWT作成    │ ←── │  コールバック  │
└─────────┘     └─────────────┘     └─────────────┘
```

---

## 設定

詳細は [guides/setup/google-oauth-setup.md](../guides/setup/google-oauth-setup.md) を参照。

### 環境変数

```bash
# 必須
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000

# オプション（Vercel環境）
# VERCEL_ENV=preview  # プレビュー環境判定用
```

---

## セッション仕様

| 項目 | 設定値 |
|-----|--------|
| 有効期限 | 30日 |
| 更新間隔 | 24時間 |
| 保存先 | JWT (token) + DB (account/link) |
| セッショントークン | 暗号化されたJWT |

---

## 認可（Authorization）

### ロールベースアクセス制御

| ロール | 説明 | アクセス範囲 |
|-------|------|-------------|
| `USER` | 一般ユーザー | 自分のデータのみ |
| `ADMIN` | 管理者 | 全データ + 管理機能 |

### ロール判定

```typescript
// セッションからロール取得
const session = await getServerSession(authOptions);
if (session?.user?.role === 'ADMIN') {
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
| `app/api/auth/[...nextauth]/route.ts` | 認証エンドポイント |
| `lib/auth-options.ts` | NextAuth設定 |
| `components/providers/SessionProvider.tsx` | セッションプロバイダー |

---

## 将来拡張

- 追加OAuthプロバイダー（Microsoft、GitHub等）
- 細粒度の権限管理（機能単位のアクセス制御）
- APIキー認証（外部連携用）
