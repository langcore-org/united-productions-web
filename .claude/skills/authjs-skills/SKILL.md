---
name: authjs-skills
description: Auth.js v5による認証設定。Google OAuth、クレデンシャル認証、セッション管理をサポート。ユーザーが「認証」「ログイン」「OAuth」「NextAuth」「セッション」などに関する質問や実装要望をした時に使用。
---

# Auth.js Skills

Next.js での Auth.js v5（NextAuth.js v5）による認証設定スキル。Google OAuth、クレデンシャル認証、セッション管理、ミドルウェア設定を網羅。

## When to use

- 「認証」「ログイン機能」などの実装時
- 「Googleログイン」「OAuth」などの発言時
- 「セッション」「session」に関する問題時
- 認証エラー、セッション問題が発生した時
- `next-auth` の型エラー、設定問題が発生した時
- ミドルウェアでの認証チェック実装時
- 「ログインできない」「認証エラー」などの発言時

## Quick Start

```bash
# セッション取得（Server Component）
import { getServerSession } from "next-auth/next";
const session = await getServerSession(authOptions);

# セッション取得（Client Component）
import { useSession } from "next-auth/react";
const { data: session } = useSession();
```

---

## 対話例：よくあるシナリオ

### シナリオ1: 「ログインできない」

```
ユーザー: 「ログインができない"

AI: 「認証問題を診断します。

【確認項目】
1. 環境変数が設定されているか
2. OAuth設定が正しいか
3. エラーメッセージの確認

まず環境変数を確認します：

```bash
cat .env.local | grep -E "NEXTAUTH|GOOGLE"
```

設定は確認できましたか？」

→ 「設定はされてると思う"

AI: 「次に、エラーの詳細を確認します。

1. ブラウザのコンソールエラーを確認
2. サーバーログを確認

どんなエラーが出ていますか？」

→ 「redirect_uri_mismatch って出る"

AI: 「原因が特定できました。

【原因】
Google Cloud Consoleでの承認済みリダイレクトURIが
実際のURLと一致していない

【解決策】
Google Cloud Console → APIとサービス → 認証情報 → OAuth 2.0 →
承認済みリダイレクトURIに以下を追加：
- http://localhost:3000/api/auth/callback/google（開発）
- https://yourdomain.com/api/auth/callback/google（本番）

確認してください。」
```

### シナリオ2: セッションが取得できない

```
ユーザー: 「セッションがnullになる"

AI: 「セッション取得問題を調査します。

【確認項目】
1. SessionProviderでラップされているか
2. getServerSessionの使い方が正しいか
3. 型拡張が正しく設定されているか

どこでセッション取得が失敗していますか？
A. Server Component
B. Client Component
C. API Route"

→ "A"

AI: "Server Componentでのセッション取得を確認します。

【正しい実装】
```typescript
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function Page() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }
  
  return <div>{session.user.name}</div>;
}
```

【よくあるミス】
- `authOptions` を正しくimportしていない
- `await` を忘れている
- `next-auth` v4/v5の混在

該当しそうなものはありますか？」
```

### シナリオ3: 型エラーの解決

```
ユーザー: 「session.user.id で型エラーになる"

AI: 「型拡張の問題です。型定義を確認します。

```typescript
// types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
```

このファイルが存在し、正しく設定されていますか？」

→ "存在するけどエラーになる"

AI: "tsconfig.json の includes に types ディレクトリが
含まれているか確認してください。

```json
{
  "include": ["types/**/*", ...]
}
```

また、TypeScriptサーバーの再起動を試してください。」
```

---

## チェックリスト

### 認証実装前チェックリスト

```markdown
## 認証実装前

- [ ] NEXTAUTH_SECRETが設定されている
- [ ] NEXTAUTH_URLが設定されている
- [ ] Google OAuth認証情報を取得済み
- [ ] 承認済みリダイレクトURIを設定済み
- [ ] 型拡張ファイルを作成済み
```

### 認証エラー対応チェックリスト

```markdown
## 認証エラー時

- [ ] 環境変数が正しく設定されているか確認
- [ ] Google Cloud Consoleの設定を確認
- [ ] ブラウザのコンソールエラーを確認
- [ ] サーバーログを確認
- [ ] SessionProviderでラップされているか確認
```

---

## Project Configuration

### 現在の認証設定

**パッケージ**: `next-auth@^4.24.13`（v4系を使用）

**重要**: プロジェクトでは `next-auth` v4 を使用（v5 betaではない）

### ファイル構成

```
lib/
├── auth/
│   ├── options.ts    # 認証設定（providers, callbacks等）
│   └── helpers.ts    # 認証ヘルパー関数
├── auth.ts           # NextAuth設定エクスポート
├── session-helpers.ts # セッション取得ヘルパー
middleware.ts         # 認証ミドルウェア
```

---

## Setup Guide

### 1. 環境変数設定

```env
# .env.local
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. 認証オプション設定

```typescript
// lib/auth/options.ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
};
```

### 3. 型拡張（重要）

```typescript
// types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
```

### 4. ミドルウェア設定

```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/((?!api|_next|static|.*\\..*|login).*)"],
};
```

---

## Common Patterns

### サーバーサイドでセッション取得

```typescript
// Server Component / Server Action
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function getSession() {
  return await getServerSession(authOptions);
}

// 使用例
export default async function Page() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return <div>Welcome, {session.user.name}</div>;
}
```

### クライアントサイドでセッション取得

```typescript
"use client";

import { useSession } from "next-auth/react";

export function UserInfo() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div>Loading...</div>;
  if (status === "unauthenticated") return <div>Not signed in</div>;

  return <div>Welcome, {session.user.name}</div>;
}
```

### 型安全なセッション取得ヘルパー

```typescript
// lib/session-helpers.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}
```

---

## Troubleshooting

### よくある型エラー

**エラー**: `Property 'id' does not exist on type 'User'`
```
解決策: types/next-auth.d.ts で型拡張を確認
```

**エラー**: `trustHost is not a type of AuthOptions`
```
解決策: 型アサーションで回避（Vercel Preview環境で必要）
const options = {
  ...authOptions,
  trustHost: true,
} as AuthOptions & { trustHost?: boolean };
```

### よくある設定エラー

**エラー**: `Cannot find module 'next-auth/providers/google'`
```
解決策: npm install next-auth
```

**エラー**: `NEXTAUTH_SECRET is not set`
```
解決策: .env.local に NEXTAUTH_SECRET を設定
生成コマンド: openssl rand -base64 32
```

### セッション関連の問題

| 症状 | 原因 | 解決策 |
|------|------|--------|
| セッションが保持されない | Cookie設定問題 | `cookies` オプションを確認 |
| セッション取得が遅い | DBアクセス | JWT戦略に変更を検討 |
| ログイン後にリダイレクトされない | callbackURL設定 | `pages.callback` を確認 |
| `redirect_uri_mismatch` | OAuth設定エラー | Google Cloud ConsoleでURI設定 |

---

## Security Best Practices

- ✅ `NEXTAUTH_SECRET` は強力なランダム文字列を使用
- ✅ Production では HTTPS を必須に
- ✅ セッション有効期限を適切に設定
- ✅ 不必要なユーザー情報はセッションに含めない
- ✅ CSRF保護はデフォルトで有効（無効化しない）

## References

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [NextAuth.js v4 Configuration](https://next-auth.js.org/configuration/options)
- [Google OAuth Setup](https://next-auth.js.org/providers/google)
- Project: `lib/auth/options.ts`, `middleware.ts`, `types/next-auth.d.ts`
