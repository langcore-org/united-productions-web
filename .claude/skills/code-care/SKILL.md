---
name: code-care
description: コード品質と型安全性の管理。コード健全性チェック、型エラーの修正、as anyの除去、マイグレーション作成など、コード品質に関連するタスクで使用。
---

# Code Care

コード品質・型安全性・DBマイグレーションを管理するスキル。

## コマンド一覧

### Health Check（健全性チェック）

```bash
# 全チェック実行
node .claude/skills/code-care/scripts/code.js health

# 個別チェック
node .claude/skills/code-care/scripts/code.js health unused     # knipで未使用コード検出
node .claude/skills/code-care/scripts/code.js health types      # tsc --noEmit
node .claude/skills/code-care/scripts/code.js health any        # as any 検出
node .claude/skills/code-care/scripts/code.js health todos      # TODOコメント一覧
```

### Type Safety（型安全性）

```bash
# as any の修正案を提示
node .claude/skills/code-care/scripts/code.js fix-any --file=app/api/chat/route.ts

# 型ガード関数を生成
node .claude/skills/code-care/scripts/code.js add-guard --interface=User

# モジュール拡張テンプレート
node .claude/skills/code-care/scripts/code.js extend-types --package=next-auth

# 型安全性の監査レポート
node .claude/skills/code-care/scripts/code.js audit-types
```

### Database（DBマイグレーション）

```bash
# 変更計画の作成
node .claude/skills/code-care/scripts/code.js db plan --change="Userにroleを追加"

# マイグレーション実行
node .claude/skills/code-care/scripts/code.js db migrate --name=add_user_role

# データロスリスクの確認
node .claude/skills/code-care/scripts/code.js db check-loss

# ロールバック手順の表示
node .claude/skills/code-care/scripts/code.js db rollback-guide
```

### Pre-commit（コミット前チェック）

```bash
# コミット前チェック全実行（推奨）
node .claude/skills/code-care/scripts/code.js pre-commit

# これは以下と同等:
# - npx tsc --noEmit
# - npm run lint
# - as any チェック
# - TODOコメント確認
```

## 使用フロー

### コミット前のチェック

```bash
# 全チェックを実行
node .claude/skills/code-care/scripts/code.js pre-commit
```

チェック内容:
1. TypeScript型チェック
2. Lintチェック
3. `as any` の有無
4. 未使用コードの検出

### as any の除去

```bash
# ファイルを指定して修正案を取得
node .claude/skills/code-care/scripts/code.js fix-any \
  --file=lib/auth/options.ts

# 出力される選択肢から最適な方法を選んで手動で修正
```

**方法1: モジュール拡張（推奨）**
```typescript
// types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: { id: string; role?: string; } & DefaultSession["user"];
  }
}
```

**方法2: 明示的なインターフェース**
```typescript
interface PDFParseModule {
  default: (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
}
const pdfParse = await import("pdf-parse") as unknown as PDFParseModule;
```

**方法3: 型ガード関数**
```typescript
function isAuthenticatedSession(
  session: Session | null
): session is Session & { user: { id: string } } {
  return !!session?.user?.id;
}
```

### DBマイグレーション

```bash
# 1. 変更計画を作成
node .claude/skills/code-care/scripts/code.js db plan \
  --change="Userテーブルにroleカラムを追加"

# 2. データロスリスクを確認
node .claude/skills/code-care/scripts/code.js db check-loss

# 3. マイグレーション実行
node .claude/skills/code-care/scripts/code.js db migrate \
  --name=add_user_role
```

## 関連ドキュメント

- `AGENTS.md` - 型安全性向上パターン
- `docs/specs/api-integration/database-schema.md` - マイグレーション手順
