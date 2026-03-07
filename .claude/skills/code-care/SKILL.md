---
name: code-care
description: コード品質と型安全性の管理。コード健全性チェック、型エラーの修正、as anyの除去、マイグレーション作成など、コード品質に関連するタスクで使用。ユーザーが「コード品質」「リファクタリング」「as any」「型エラー」「健全性チェック」などに関する質問や要望をした時に使用。
---

# Code Care

コード品質・型安全性・DBマイグレーションを管理するスキル。

## When to use

- 「コード品質」「リファクタリング」などの発言時
- 「as any」を使わずに型安全にしたい時
- 型エラーの根本解決が必要な時
- コミット前の健全性チェック時
- 「健全性チェック」「ヘルスチェック」などの発言時
- 未使用コードの検出・削除時
- DBマイグレーションの計画時

## Quick Start

```bash
# 全チェック実行
node .claude/skills/code-care/scripts/code.js health

# コミット前チェック
node .claude/skills/code-care/scripts/code.js pre-commit

# as any の修正案を取得
node .claude/skills/code-care/scripts/code.js fix-any --file=app/api/chat/route.ts
```

---

## 対話例：よくあるシナリオ

### シナリオ1: as any の除去

```
ユーザー: 「as any を使わない方法を教えて"

AI: 「as any の除去パターンを提示します。

【状況の確認】
どのようなケースでしょうか？

A. 外部ライブラリの型が不完全
B. 動的インポートの型
C. APIレスポンスの型
D. その他"

→ "A"

AI: "【解決策: モジュール拡張】

```typescript
// types/pdf-parse.d.ts
declare module "pdf-parse" {
  interface PDFData {
    text: string;
    numpages: number;
  }
  
  function pdfParse(buffer: Buffer): Promise<PDFData>;
  export default pdfParse;
}
```

これで `as any` 不要になります。

作成しますか？」
```

### シナリオ2: 健全性チェック

```
ユーザー: 「コードの健全性をチェックしたい"

AI: 「健全性チェックを実行します。

```bash
node .claude/skills/code-care/scripts/code.js health
```

[実行結果]

AI: 「チェック結果：

✅ TypeScript型チェック: 通過
⚠️ 未使用コード: 3ファイル検出
❌ as any: 2箇所検出
✅ Lint: 通過

対応が必要な項目：
1. 未使用コードの削除
2. as any の除去

どちらから対応しますか？」
```

### シナリオ3: 型安全性の監査

```
ユーザー: 「型安全性を改善したい"

AI: 「型安全性の監査を実施します。

```bash
node .claude/skills/code-care/scripts/code.js audit-types
```

[監査結果]

AI: 「監査結果：

【問題箇所】
1. lib/api/client.ts: implicit any
2. components/Form.tsx: 型ガード不足
3. hooks/useData.ts: ジェネリック未使用

【推奨アクション】
- strictモードの有効化検討
- 型ガード関数の導入
- ジェネリックの適切な使用

優先的に対応すべき箇所はどこですか？」
```

---

## チェックリスト

### コミット前チェックリスト

```markdown
## コミット前

- [ ] `node .claude/skills/code-care/scripts/code.js pre-commit` を実行
- [ ] TypeScript型チェックが通過
- [ ] Lintチェックが通過
- [ ] `as any` がない（または正当事由あり）
- [ ] 未使用コードがない
- [ ] TODOコメントが残っていない（またはバックログ化済み）
```

### リファクタリング前チェックリスト

```markdown
## リファクタリング前

- [ ] 現在の動作をテストで記録（ある場合）
- [ ] 影響範囲を特定
- [ ] 段階的なリファクタリング計画を作成
- [ ] ロールバック方法を確認
```

### 型安全性向上チェックリスト

```markdown
## 型安全性向上

- [ ] `as any` を除去
- [ ] `unknown` を適切に使用
- [ ] 型ガード関数を導入
- [ ] モジュール拡張で外部ライブラリの型を補完
- [ ] strictモードを検討
```

---

## Commands

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

---

## as any の除去パターン

### 方法1: モジュール拡張（推奨）

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
}
```

### 方法2: 明示的なインターフェース

```typescript
interface PDFParseModule {
  default: (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
}
const pdfParse = await import("pdf-parse") as unknown as PDFParseModule;
```

### 方法3: 型ガード関数

```typescript
function isAuthenticatedSession(session: Session | null): session is Session & { user: { id: string } } {
  return !!session?.user?.id;
}
```

---

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

---

## 関連ドキュメント

- `AGENTS.md` - 型安全性向上パターン
- `docs/specs/api-integration/database-schema.md` - マイグレーション手順
