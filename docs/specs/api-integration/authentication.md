# 認証・認可仕様

> **NextAuth.js v5 (Auth.js) による認証体系**

## 概要

- **フレームワーク**: NextAuth.js v5 (Auth.js)
- **プロバイダー**: Google OAuth 2.0 (Workspace SSO対応)
- **セッション管理**: JWT + Database ハイブリッド

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

## 設定

詳細は [guides/setup/google-oauth-setup.md](../guides/setup/google-oauth-setup.md) を参照。

## セッション仕様

| 項目 | 設定値 |
|-----|--------|
| 有効期限 | 30日 |
| 更新間隔 | 24時間 |
| 保存先 | JWT (token) + DB (account/link) |

## 認可（Authorization）

現在は認証のみ。認可（ロールベース等）は未実装。

将来拡張時は `specs/authorization.md` を作成予定。

## 関連ファイル

- `middleware.ts` - 認証チェックミドルウェア
- `app/api/auth/[...nextauth]/route.ts` - 認証エンドポイント
- `lib/auth.ts` - 認証ユーティリティ
