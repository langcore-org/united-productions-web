# トラブルシューティングガイド

> **開発中に発生するよくある問題と解決策**
> 
> **最終更新**: 2026-02-20 13:16

---

## 🔧 ビルド・型エラー

### next-auth 型エラー

**エラーメッセージ:**
```
Property 'trustHost' does not exist on type 'AuthOptions'
```

**原因:**
next-auth v4.24.13 の型定義に `trustHost` が含まれていない

**対応:**
```typescript
// types/next-auth.d.ts で型拡張
declare module "next-auth" {
  interface AuthOptions {
    trustHost?: boolean;
  }
}
```

または型アサーションを使用:
```typescript
const options = {
  ...authOptions,
  trustHost: true,
} as AuthOptions & { trustHost?: boolean };
```

---

### Prisma Client 未生成エラー

**エラーメッセージ:**
```
Cannot find module '@prisma/client'
または
PrismaClient is not defined
```

**対応:**
```bash
# Prisma Client の再生成
npx prisma generate

# スキーマ変更時はマイグレーションも実行
npx prisma migrate dev
```

---

### TypeScript ビルドエラー

**エラーメッセージ:**
```
Type error: Type 'X' is not assignable to type 'Y'
```

**対応手順:**
1. 型定義を確認: `types/` ディレクトリの該当ファイルをチェック
2. モジュール拡張を確認: `types/*.d.ts` で型拡張が定義されているか
3. 明示的な型アサーション（最終手段）:
   ```typescript
   const data = response as unknown as ExpectedType;
   ```

---

## 🚀 開発サーバー問題

### ホットリロードが効かない

**原因と対応:**

| 変更内容 | 必要な対応 |
|---------|-----------|
| `.env.local` | サーバー再起動が必要 |
| `prisma/schema.prisma` | `npx prisma generate` 実行後再起動 |
| `middleware.ts` | サーバー再起動が必要 |
| `next.config.ts` | サーバー再起動が必要 |

**再起動コマンド:**
```bash
# Next.js開発サーバーの再起動
npm run dev

# キャッシュクリア付き
rm -rf .next && npm run dev
```

---

### ポート 3000 が使用中

**エラーメッセージ:**
```
Port 3000 is already in use
```

**対応:**
```bash
# 使用中のプロセスを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>

# または別ポートで起動
npm run dev -- --port 3001
```

---

## 🗄️ データベース問題

### データベース接続エラー

**エラーメッセージ:**
```
Error: P1001: Can't reach database server
```

**対応:**
1. 環境変数 `DATABASE_URL` が正しく設定されているか確認
2. Neon/PostgreSQL の接続状態を確認
3. 接続文字列の形式を確認:
   ```
   postgresql://user:password@host:port/database?sslmode=require
   ```

---

### マイグレーションエラー

**エラーメッセージ:**
```
Error: P3005: The database schema is not empty
```

**対応:**
```bash
# ベースラインを設定（既存DBの場合）
npx prisma migrate resolve --applied 0_init

# またはリセット（開発環境のみ）
npx prisma migrate reset
```

⚠️ **注意:** `migrate reset` はデータを削除します。本番環境では使用しないこと。

---

## 🔐 認証問題

### Google OAuth エラー

**エラーメッセージ:**
```
Error: redirect_uri_mismatch
```

**対応:**
1. Google Cloud Console で承認済みリダイレクトURIを確認
2. 開発環境: `http://localhost:3000/api/auth/callback/google`
3. 本番環境: `https://your-domain.com/api/auth/callback/google`

---

### セッションが取得できない

**症状:**
- `getServerSession` が `null` を返す
- ログイン状態なのに未認証扱いになる

**対応:**
1. `NEXTAUTH_SECRET` が設定されているか確認
2. Cookie設定を確認:
   ```typescript
   cookies: {
     sessionToken: {
       name: process.env.NODE_ENV === 'production' 
         ? '__Secure-next-auth.session-token' 
         : 'next-auth.session-token',
     },
   }
   ```

---

## 📦 パッケージ問題

### 依存関係の競合

**エラーメッセージ:**
```
npm ERR! ERESOLVE could not resolve
```

**対応:**
```bash
# ロックファイルを削除して再インストール
rm package-lock.json
rm -rf node_modules
npm install

# または --legacy-peer-deps を使用
npm install --legacy-peer-deps
```

---

### 型定義パッケージ不足

**エラーメッセージ:**
```
Could not find a declaration file for module 'X'
```

**対応:**
```bash
# 型定義パッケージをインストール
npm install -D @types/package-name

# 型定義がない場合は独自に定義
# types/package-name.d.ts を作成
declare module 'package-name' {
  // 型定義
}
```

---

## 🧪 テスト問題

### Vitest 実行エラー

**エラーメッセージ:**
```
Error: Failed to load url
```

**対応:**
```bash
# 設定ファイルを確認
cat vitest.config.ts

# エイリアス設定が正しいか確認
# tsconfig.json の paths と一致しているか
```

---

### Playwright ブラウザ未インストール

**エラーメッセージ:**
```
Error: Executable doesn't exist
```

**対応:**
```bash
# ブラウザをインストール
npx playwright install

# または Chromium のみ
npx playwright install chromium
```

---

## 🌐 デプロイ問題

### Vercel ビルド失敗

**確認ポイント:**

1. **環境変数**
   ```bash
   # Vercel Dashboard で確認
   - DATABASE_URL
   - NEXTAUTH_SECRET
   - NEXTAUTH_URL
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   ```

2. **ビルドコマンド**
   ```bash
   # package.json の scripts
   "build": "prisma generate && next build"
   ```

3. **Node.js バージョン**
   ```json
   // package.json
   "engines": {
     "node": ">=20.0.0"
   }
   ```

---

### Edge Function タイムアウト

**エラーメッセージ:**
```
Error: Edge Function execution timed out
```

**対応:**
- Edge Runtime の制限: 30秒
- 長時間処理は Node.js runtime に変更:
  ```typescript
  export const runtime = 'nodejs';
  ```

---

## 🐛 よくある実装ミス

### Server Component でブラウザAPI使用

**エラー:**
```
window is not defined
```

**対応:**
```typescript
// ❌ 間違い
async function Page() {
  const data = localStorage.getItem('key'); // Server Componentで使用
}

// ✅ 正しい
"use client";
function Page() {
  const data = localStorage.getItem('key');
}

// ✅ または動的インポート
async function Page() {
  const data = await getServerData(); // Server側で取得
}
```

---

### useEffect の無限ループ

**症状:**
- ページがフリーズする
- コンソールに無限にログが出力される

**対応:**
```typescript
// ❌ 間違い
useEffect(() => {
  setState(newValue); // 依存配列なしでstate更新
});

// ✅ 正しい
useEffect(() => {
  setState(newValue);
}, [dependency]); // 適切な依存配列
```

---

### Prisma インスタンス多重生成

**警告:**
```
warn(prisma-client) There are already 10 instances of Prisma Client
```

**対応:**
```typescript
// lib/prisma.ts でシングルトンパターンを使用
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

---

## 📋 デバッグコマンド集

```bash
# 型チェック（ビルドなし）
npx tsc --noEmit

# Lint実行
npm run lint

# テスト実行
npm run test

# E2Eテスト（UIモード）
npm run test:e2e:ui

# Prisma Studio起動
npx prisma studio

# 環境変数確認
node -e "console.log(process.env)"
```

---

## 🔗 関連ドキュメント

| 項目 | 参照先 |
|-----|--------|
| 環境構築 | [setup/database-cache.md](./setup/database-cache.md) |
| 認証設定 | [setup/vercel-authentication.md](./setup/vercel-authentication.md) |
| エラーハンドリング | [../specs/error-handling.md](../specs/error-handling.md) |
| テスト戦略 | [../specs/testing-strategy.md](../specs/testing-strategy.md) |

---

## 🆘 解決できない場合

1. **ログを確認**: `logs/` ディレクトリの該当ファイルを確認
2. **ドキュメント検索**: `grep -r "エラーメッセージ" docs/`
3. **チームに相談**: Slack `#ad-production-dev` チャンネル
