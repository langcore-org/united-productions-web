# セキュリティ仕様

> **セキュリティ対策とガイドライン**
> 
> **最終更新**: 2026-02-20 13:16

---

## セキュリティ原則

### 基本方針

1. **Defense in Depth** - 多層防御
2. **Least Privilege** - 最小権限
3. **Fail Secure** - 安全な失敗
4. **Secure by Default** - デフォルトで安全

---

## 認証・認可

### NextAuth.js 設定

```typescript
// lib/auth.ts
export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  
  // セキュリティ設定
  secret: process.env.NEXTAUTH_SECRET,
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  
  // コールバック
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};
```

### 環境変数

```bash
# .env.local（開発環境）
NEXTAUTH_SECRET=your-random-secret-min-32-chars
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# .env.production（本番環境）
NEXTAUTH_SECRET=<strong-random-secret>
NEXTAUTH_URL=https://your-domain.com
```

⚠️ **注意:**
- `NEXTAUTH_SECRET` は32文字以上のランダム文字列
- 本番と開発で異なる値を使用
- GitHubにコミットしない

---

## 入力検証

### Zod スキーマ

```typescript
// lib/validation.ts
import { z } from 'zod';

// ユーザー入力
export const userInputSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  name: z.string().min(1).max(100),
});

// ファイルアップロード
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(f => f.size <= 10 * 1024 * 1024, '10MB以下のファイルを選択してください')
    .refine(f => ['text/plain', 'text/vtt'].includes(f.type), '対応していないファイル形式です'),
});

// APIリクエスト
export const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(10000),
  })),
  provider: z.enum(['gemini', 'grok', 'perplexity']),
});
```

### サニタイズ

```typescript
// ユーザー入力のサニタイズ
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: [],
  });
}
```

---

## APIセキュリティ

### レート制限

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 1分間に30リクエスト
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success, limit, remaining } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
      },
    });
  }
  
  return NextResponse.next();
}
```

### CORS

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXTAUTH_URL },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

---

## ファイルアップロード

### セキュリティチェック

```typescript
// app/api/upload/route.ts
import { extname } from 'path';

const ALLOWED_EXTENSIONS = ['.txt', '.vtt', '.docx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // 拡張子チェック
  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return Response.json(
      { error: '許可されていないファイル形式です' },
      { status: 400 }
    );
  }
  
  // サイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: 'ファイルサイズが大きすぎます' },
      { status: 400 }
    );
  }
  
  // マジックナンバーチェック（ファイル内容の検証）
  const buffer = await file.arrayBuffer();
  if (!isValidFileContent(buffer, ext)) {
    return Response.json(
      { error: 'ファイル内容が不正です' },
      { status: 400 }
    );
  }
  
  // 処理続行...
}
```

---

## セキュリティヘッダー

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self';",
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## 機密情報管理

### ログ出力禁止項目

```typescript
// lib/logger.ts
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
];

export function sanitizeLogData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sanitized = { ...data };
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }
  
  return sanitized;
}
```

---

## セキュリティチェックリスト

### 実装時

- [ ] ユーザー入力は検証・サニタイズされているか
- [ ] SQLインジェクション対策（Prisma使用で自動対応）
- [ ] XSS対策（Reactの自動エスケープ）
- [ ] CSRF対策（NextAuth.jsで対応）
- [ ] 認証チェックが適切に行われているか
- [ ] 権限制御が実装されているか
- [ ] ファイルアップロードは拡張子・サイズチェックがあるか
- [ ] 機密情報は環境変数で管理されているか

### デプロイ前

- [ ] 本番用の強力な `NEXTAUTH_SECRET` を設定
- [ ] HTTPSを強制
- [ ] セキュリティヘッダーを設定
- [ ] レート制限を有効化
- [ ] エラーログ監視を設定

### 定期レビュー

- [ ] 依存パッケージの脆弱性チェック（`npm audit`）
- [ ] APIキーのローテーション
- [ ] アクセスログの確認
- [ ] セキュリティパッチの適用

---

## インシデント対応

### 検知時の対応フロー

1. **影響範囲の特定**
   - どのデータが影響を受けたか
   - どのユーザーが影響を受けたか

2. **一時対応**
   - 該当機能の無効化
   - トークンの無効化

3. **根本原因調査**
   - ログ分析
   - 脆弱性の特定

4. **恒久対応**
   - パッチ適用
   - 再発防止策

5. **報告**
   - 関係者への通知
   - 必要に応じて外部報告

---

## 関連ドキュメント

| 項目 | 参照先 |
|-----|--------|
| 認証仕様 | [./authentication.md](./authentication.md) |
| エラーハンドリング | [./error-handling.md](./error-handling.md) |
| ログ・監視 | [./logging-monitoring.md](./logging-monitoring.md) |
| 環境構築 | [../guides/setup/vercel-authentication.md](../guides/setup/vercel-authentication.md) |
