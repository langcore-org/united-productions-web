# Agent Behavior Guidelines

> **AI Hub 開発エージェントの行動指針**
> 
> **最終更新**: 2026-02-21 17:16

---

## 🛠 技術スタック

### LLMフレームワーク（重要）

**このプロジェクトでは LangChain を使用しています。**

| パッケージ | 用途 |
|-----------|------|
| `langchain` | コアフレームワーク |
| `@langchain/core` | 型定義・基本機能 |
| `@langchain/openai` | OpenAI連携 |
| `@langchain/anthropic` | Anthropic連携 |
| `@langchain/community` | コミュニティ統合 |
| `@langchain/textsplitters` | テキスト分割 |

**実装場所**: `lib/llm/langchain/`

**参照**: [llm-integration-overview.md](./docs/specs/api-integration/llm-integration-overview.md)

---

## 📚 ドキュメント参照ガイド

### 必ず確認するドキュメント

| タイミング | 参照先 | 目的 |
|-----------|--------|------|
| タスク着手前 | `docs/README.md` | ドキュメント構成と更新ルール |
| システム理解時 | `docs/specs/system-architecture.md` | 全体構成と設計パターン |
| API実装時 | `docs/specs/api-specification.md` | API仕様と型定義 |
| **LLM実装時** | **`docs/specs/api-integration/llm-integration-overview.md`** | **LangChain使用方針** |
| DB変更時 | `docs/specs/database-schema.md` | スキーマ設計とインデックス |
| エラー処理時 | `docs/specs/error-handling.md` | エラーコードとレスポンス形式 |
| デプロイ時 | `docs/specs/deployment-guide.md` | 環境変数と手順 |

### ドキュメント更新ルール（必須）

1. **更新日時を必ず記載** - `YYYY-MM-DD HH:MM` 形式
   ```bash
   # 現在日時を取得
   date +"%Y-%m-%d %H:%M"
   ```
2. **1ファイル200行以内** - 超える場合は分割
3. **内容の重複禁止** - 詳細は1箇所に集約、他は参照リンク
4. **参照リンクを充実** - 関連ファイルへのリンクを必ず記載

詳細: `docs/README.md` の「ドキュメント作成・更新ルール」セクション

---

## 🎯 タスク着手前の必須確認

コードを変更する前に、必ず以下を確認してから作業を始めること。

### 1. タスクスコープの定義
- 変更するファイルを着手前にリストアップし、ユーザーに提示する
- リストに含まれていないファイルは変更しない（既存エラーは別タスクで対応）
- 作業中に関連する別の問題を発見した場合は、その場で報告しつつ現タスクを完了させる

```
# 着手前に宣言する例
## 変更予定ファイル
- app/(authenticated)/transcripts/page.tsx（重複定義の削除）

## 変更しないファイル
- それ以外すべて（既存エラーは別対応）
```

### 2. 環境・依存関係の事前調査
エラーが出てから調べるのではなく、**変更前に**確認する。

```bash
# パッケージの実際のバージョンを確認する
cat package.json | grep -A1 "dependencies"
cat node_modules/<package>/package.json | grep '"version"'

# 型定義の実際のエクスポートを確認する
grep -n "export" node_modules/<package>/index.d.ts
```

---

## 🔒 セキュリティ・設定ファイルの扱い

### 変更前に意図を理解する
設定値を削除・変更する前に、その設定が何のためにあるかを必ず確認する。

```
確認すべき質問：
- この設定を削除すると、どの環境で何が壊れるか？
- コメントや周辺コードに意図が書かれていないか？
- 環境変数を参照している場合、その変数の意味は何か？
```

### 削除してはならない設定の例
```typescript
// ❌ 型エラーが出るからといって削除してはならない
trustHost: process.env.VERCEL_ENV === "preview" || ...
// → Vercel プレビュー環境の認証に必要。削除するとプレビューURLで認証が壊れる

// ❌ 理解せずに削除してはならない
NEXTAUTH_SECRET, AUTH_SECRET, CSRF設定, CORSヘッダー
```

### 型エラーで設定を削除したくなったとき
削除ではなく、型定義の問題として扱う。

```typescript
// ❌ 禁止: 設定を削除する
// ✅ 正しい対処: 型を拡張するか、型アサーションをその箇所のみに限定する
const options = {
  ...authOptions,
  trustHost: true, // next-auth v5型定義には含まれないが実行時に有効
} as AuthOptions & { trustHost?: boolean }
```

---

## 🔁 デバッグ・修正のループ制限

### ビルドエラーの修正は最大3回まで
同じファイルへの修正が3回を超えた場合：
1. **状況を報告する**（ユーザーに現在の状況を伝える）
2. **選択肢を提示する**（A/B/C の選択肢を示す）
3. **作業を続ける**（ユーザーからの指示がない場合は、最も確実な方法で進める）

```
# 報告フォーマット（作業を止めずに報告）
## 現状報告
- 修正済み: XXX（完了）
- 進行中: auth-options.ts の next-auth 型問題（3回目の修正）

## 問題の詳細
next-auth のインストールバージョン (v4.24.13) と
型定義の間に不整合があります。

## 対応方法（自動選択）
型アサーションを使用して型エラーを回避し、機能は保持します。
```

### 試行錯誤を減らす調査ファースト原則
修正を試みる前に、必ずドキュメント・型定義・実際のコードを読む。

```bash
# 例: next-auth の型を調べてから修正する
grep -rn "export.*Options\|export.*Config" node_modules/next-auth/*.d.ts
grep -rn "export.*Session" node_modules/next-auth/core/types.d.ts
```

---

## 📝 型安全性の向上パターン

### `as any` の除去方法

型安全性を損なう `as any` は以下の方法で段階的に除去する。

#### 方法1: モジュール拡張（推奨）
外部ライブラリの型が不足している場合、`types/` ディレクトリで拡張する。

```typescript
// types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
    accessToken?: string;
  }
}
```

#### 方法2: 明示的なインターフェース定義
動的インポートの戻り値に型を付ける。

```typescript
// ❌ 禁止
const pdfParse: any = await import("pdf-parse");

// ✅ 正しい
interface PDFParseModule {
  default: (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
}
const pdfParse = await import("pdf-parse") as unknown as PDFParseModule;
```

#### 方法3: 型ガード関数
型の絞り込みに使用する。

```typescript
function isAuthenticatedSession(session: Session | null): session is Session & { user: { id: string } } {
  return !!session?.user?.id;
}
```

### 実績
- **2026-02-19**: コードベースから `as any` を完全除去（17箇所 → 0箇所）
- **手法**: モジュール拡張 + 明示的インターフェース
- **結果**: ビルド成功、型安全性向上

---

## 📦 パッケージインストールのルール

- `npm install` はタイムアウトリスクがあるため、並列処理で他の作業も進める
- インストール前に `npm ls <package>` でインストール済みか確認する
- インストール中も状況をユーザーに報告しつつ、他の修正作業を並行して進める
- インストールが完了したら即座にビルドテストを実行する

```bash
# インストール前の確認
npm ls pdf-parse 2>&1
# → not found が出た場合はインストールと並行して他の作業を進める
```

---

## ✅ コミット前チェックリスト

以下がすべて **pass** してからコミットする。
一つでも失敗した場合は修正を続けてからコミットする。

```bash
# 1. 型チェック（ビルドなし、高速）
npx tsc --noEmit 2>&1 | grep -v node_modules

# 2. Lint
npm run lint

# 3. ビルド
npm run build

# 4. 新規 as any がないことを確認
git diff --staged | grep "as any"
# → 出力があれば適切な型定義に修正する
```

### コミットメッセージ形式
```
fix: <変更の概要>

- 変更したファイルと理由
- 発見した既存問題とその対応状況
```

---

## 🚨 報告条件（作業は止めずに報告）

以下のいずれかに該当する場合は**作業を続けながら**ユーザーに報告する。

- [ ] 同一ファイルへの修正が3回を超えた（進捗報告）
- [ ] npm install が必要になった（並行処理で進める）
- [ ] セキュリティ関連の設定（認証・CORS・シークレット）を変更する必要が出た（意図確認）
- [ ] タスクスコープ外のファイルを変更しないとビルドが通らない（方針確認）
- [ ] `as any` を使わないと解決できない型エラーが発生した（一時対応の報告）

**基本方針: 報告しつつ作業を進める。中断はしない。**
