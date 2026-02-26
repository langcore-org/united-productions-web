# Agent Behavior Guidelines

> **AI Hub 開発エージェントの行動指針**
> 
> **最終更新**: 2026-02-24 16:45

---

## 🛠 技術スタック

### LLMフレームワーク（重要）

| 項目 | 内容 |
|------|------|
| **現在のプロバイダー** | **xAI (Grok) のみ** |
| **実装方式** | **xAI直接API呼び出し**（LangChain不使用） |
| **LangChain** | 将来のGemini追加に備え保持（現在使用せず） |

#### なぜLangChainを保持するのか

- **将来の拡張性**: Google Gemini追加時にLangChain経由で統合可能に
- **過去の投資**: 実装済みのLangChainコードを完全削除せず、再利用可能に
- **切り替え容易性**: 必要時に `lib/llm/factory.ts` でプロバイダー分岐を追加

#### パッケージ

| パッケージ | 用途 | 状態 |
|-----------|------|------|
| `langchain` | コアフレームワーク | 📦 保持（将来用） |
| `@langchain/core` | 型定義・基本機能 | 📦 保持（将来用） |
| `@langchain/openai` | OpenAI連携 | 📦 保持（将来用） |
| `@langchain/anthropic` | Anthropic連携 | 📦 保持（将来用） |
| `@langchain/community` | コミュニティ統合 | 📦 保持（将来用） |

#### 実装場所

- **xAI直接実装**: `lib/llm/clients/grok.ts`（復元予定）
- **LangChain実装**: `lib/llm/langchain/`（将来のGemini追加用に保持）

**参照**: [llm-integration-overview.md](./docs/specs/api-integration/llm-integration-overview.md)

---

## 📚 ドキュメント参照ガイド

### 必ず確認するドキュメント

| タイミング | 参照先 | 目的 |
|-----------|--------|------|
| タスク着手前 | `docs/README.md` | ドキュメント構成と更新ルール |
| **技術選定時** | **`docs/lessons/README.md`** | **過去の技術選定の教訓と失敗** |
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
2. **内容の重複禁止** - 詳細は1箇所に集約、他は参照リンク
3. **参照リンクを充実** - 関連ファイルへのリンクを必ず記載

詳細: `docs/README.md` の「ドキュメント作成・更新ルール」セクション

### 実装中の保留タスク・イシュー管理（必須）

実装中に「後で対応したい」タスクや問題を発見したら、**必ず記録する**：

```bash
# 即座に backlog/ にファイルを作成
cat > "docs/backlog/todo-$(date +%s)-brief-description.md" << 'EOF'
> **優先度**: ⏸️ 保留
> **発見日": $(date +"%Y-%m-%d")
> **関連ファイル": app/path/to/file.ts

# TODO: タイトル

## 内容

実装中に後回しにしたタスクの詳細
EOF

# コードに TODO コメントを残す
# TODO: [優先度] 説明
# docs/backlog/todo-xxx.md を参照
```

詳細: [docs/backlog/README.md](./docs/backlog/README.md)

### 学びの記録（重要）

実装中に以下のような状況が発生したら、`docs/lessons/` に記録を検討する：

| シグナル | 対応 |
|---------|------|
| 同じファイルに3回以上修正を加えた | 記録検討 |
| 「あれ、思ってたんと違う」と思った | 記録検討 |
| 「もっと早く気づけばよかった」と思った | 記録検討 |
| 見積もりの2倍以上の時間がかかった | 記録検討 |
| 技術選定を見直した（導入→削除等） | **必ず記録** |

詳細: [docs/lessons/README.md](./docs/lessons/README.md)

---

## 📁 docs/ ディレクトリ運用（概要）

### 構造

```
docs/
├── README.md          # 入り口（必ず最初に読む）
├── specs/             # 技術仕様（信頼できる唯一の情報源）
├── guides/            # 手順書（ステップバイステップ）
├── plans/             # 計画書（進行中のみ）
├── backlog/           # 検討・調査・保留タスク
├── user-docs/         # ユーザードキュメント
└── archive/           # 過去資料（基本参照不要）
```

### 運用ルール

| ルール | 説明 |
|--------|------|
| **入り口は README.md** | 何か調べる時はまず `docs/README.md` を読む |
| **plans/ は進行中のみ** | 完了した計画は `archive/` へ移動 |
| **backlog/ を活用** | 実装中の保留タスク・イシューは必ず記録 |

### 検索コマンド

```bash
# キーワードで docs/ 内を検索
grep -r "LangChain" docs/specs/ --include="*.md"

# 最近更新されたファイルを確認
ls -lt docs/**/*.md | head -10
```

詳細: `docs/README.md`

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

### 2. plans/ の確認（実装タスクの場合）

実装を開始する前に、必ず `plans/` に計画書が存在することを確認：

```bash
# 現在の計画を確認
ls -la docs/plans/

# 関連する計画書を読む
cat docs/plans/{関連する計画}.md
```

**計画書がない場合は作成するか、ユーザーに確認する。**

### 3. 環境・依存関係の事前調査
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

### lintエラーの対応方針

#### 根本的な解決を優先する
lintエラー（biome/eslint等）が発生した場合：

1. **最初から根本的な解決を試みる**
   - 無視コメント（ignore）での回避は最後の手段
   - useCallback/useMemoの適切な使用
   - 依存配列の正しい設定

2. **一時的な回避が必要な場合**
   - `--no-verify`でのコミットは一時的な対応
   - **必ず`docs/backlog/`に記録する**
   ```bash
   cat > "docs/backlog/todo-$(date +%s)-lint-error-description.md" << 'EOF'
   > **優先度**: ⏸️ 保留
   > **発見日": $(date +"%Y-%m-%d")
   > **関連ファイル": app/path/to/file.ts
   
   # TODO: lintエラーの根本的解決
   
   ## 内容
   
   一時的に無視コメント/--no-verifyで回避したlintエラーの詳細
   
   ## 本来の対応
   
   - 根本的な解決方法を記載
   
   ## 先送り理由
   
   - 先送りした理由を記載
   EOF
   ```

3. **先送り禁止のケース**
   - セキュリティ関連の設定
   - 既存コードのlintエラー（今回の修正で発生したもの）
   - 型安全性を損なう変更

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

## 🚀 Vercelデプロイ監視

Gitプッシュ後のVercelデプロイを自動監視するスクリプトを活用する。

### 使用方法

```bash
# Gitプッシュ後にデプロイを監視
npm run deploy:monitor

# または直接実行
./scripts/vercel-monitor.sh

# 別のプロジェクトを監視
./scripts/vercel-monitor.sh my-app

# デプロイメント一覧を確認
npm run deploy:status
```

### 機能

| 機能 | 説明 |
|------|------|
| **新規デプロイ検出** | Gitプッシュ後の新しいデプロイメントを自動検出（最大5分待機） |
| **状態監視** | Ready/Error状態になるまで自動ポーリング |
| **ログ表示** | 成功時はサマリー、失敗時はエラーログを自動表示 |
| **カスタマイズ** | 環境変数 `MAX_WAIT` と `INTERVAL` で待機時間調整可能 |

### 環境変数

```bash
# 待機時間を10分に延長
MAX_WAIT=600 npm run deploy:monitor

# チェック間隔を5秒に短縮
INTERVAL=5 npm run deploy:monitor
```

### デプロイエラー対応フロー

1. **エラーログの自動取得**: スクリプトが失敗時に自動的にログを表示
2. **根本原因の特定**: エラーメッセージを分析
3. **修正と再デプロイ**: 修正後、再度 `git push` と `npm run deploy:monitor`

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

## 🔄 実装中のドキュメント更新フロー

### plans/ の更新（実装と並行して）

実装を進めながら、`plans/` の計画書に実装状況を随時更新する：

```markdown
## 実装状況（YYYY-MM-DD 更新）

- [x] タスク1: 完了
- [x] タスク2: 完了
- [ ] タスク3: 進行中（80%）
- [ ] タスク4: 未着手

### 保留タスク

- エラーハンドリングの改善 → docs/backlog/todo-error-handling.md

### 発見した問題

- メモリリークの可能性 → docs/backlog/issue-memory-leak.md
```

### 実装完了時のチェックリスト

実装が完了したら：

```bash
# 1. plans/ の計画書を最終更新
echo "## 実装完了（$(date +"%Y-%m-%d")）" >> docs/plans/xxx.md

# 2. 完了した計画を archive/ に移動
mv docs/plans/xxx.md "docs/archive/$(date +%Y-%m-%d)-xxx.md"

# 3. 保留タスクが残っていないか確認
grep -l "⏸️ 保留" docs/backlog/*.md 2>/dev/null || echo "保留タスクなし"
```

---

## 🚨 報告条件（作業は止めずに報告）

以下のいずれかに該当する場合は**作業を続けながら**ユーザーに報告する。

- [ ] 同一ファイルへの修正が3回を超えた（進捗報告）
- [ ] npm install が必要になった（並行処理で進める）
- [ ] セキュリティ関連の設定（認証・CORS・シークレット）を変更する必要が出た（意図確認）
- [ ] タスクスコープ外のファイルを変更しないとビルドが通らない（方針確認）
- [ ] `as any` を使わないと解決できない型エラーが発生した（一時対応の報告）
- [ ] 実装中に大きな設計変更が必要になった（計画書更新の確認）
- [ ] 保留タスク・イシューを発見した（backlog/ への記録報告）

**基本方針: 報告しつつ作業を進める。中断はしない。**

---

## 📁 ドキュメント運用ルール（必須）

### ファイル命名規則

| ディレクトリ | 命名規則 | 例 |
|-------------|---------|-----|
| `docs/plans/` | `計画名.md`（プラン作成日はメタデータ内） | `conversation-memory-design.md` |
| `docs/lessons/` | `YYYY-MM-DD-タイトル.md`（**終了日**を先頭に） | `2026-02-26-chat-streaming-loading-issue.md` |
| `docs/archive/` | `YYYY-MM-DD-元のファイル名.md`（**アーカイブ日**を先頭に） | `2026-02-22-refactoring-completed.md` |
| `docs/backlog/` | `idea-機能名.md` / `research-調査名.md` / `todo-タスク名.md` | `idea-vtuber-research.md` |

**重要**: 
- `lessons/` は**終了・完了した日付**をファイル名に入れる
- `archive/` は**アーカイブした日付**をファイル名に入れる
- `plans/` は**作成日ではなく計画名**をファイル名に入れ、日付はメタデータ内に記載

### ドキュメントライフサイクル

```
【実装前】
アイデア発生 → backlog/ に配置 → 検討・調査 → 実装決定 → plans/ に計画書作成

【実装中】
plans/ の計画書を随時更新（実装状況を記録）
    ↓ 保留タスク・イシュー発見 → backlog/ に記録

【実装完了後】
        ↓
「教訓・知見が得られたか？」
    ↓
    Yes → lessons/ に変換・移動（終了日をファイル名に）
    ↓
    No  → archive/ に移動（アーカイブ日をファイル名に）
```

### 判断基準: lessons/ への移動

以下のいずれかに該当する場合は `lessons/` に移動：

- 「3ヶ月後の自分が同じ状況で、これを知っていれば異なる判断をするか」→ Yes
- 技術選定の失敗・成功
- アーキテクチャの変更
- パフォーマンス改善の知見
- フレームワーク・ライブラリの導入判断
- 同じ問題で3回以上試行錯誤した
- 見積もりが2倍以上外れた

### lessons/ への変換手順

```bash
# 1. 計画書をベースに lessons ファイルを作成（終了日を先頭に）
cp docs/plans/your-plan.md "docs/lessons/$(date +%Y-%m-%d)-title.md"

# 2. 内容を書き換え（タスク一覧→結果サマリー、技術選定理由→背景・判断基準）
# 3. 必須セクション: 概要、背景、結果、教訓、推奨事項
# 4. lessons/README.md に一覧追加
# 5. 元の計画書は削除（または archive/ に移動して参照先を記載）
```

### 各ディレクトリの役割

| ディレクトリ | 役割 | 更新頻度 | 信頼度 |
|-------------|------|---------|-------|
| `specs/` | 技術仕様（唯一の信頼情報源） | 随時 | ⭐⭐⭐ |
| `lessons/` | **過去の教訓・推奨事項** | 学び発生時 | ⭐⭐⭐ |
| `plans/` | 実装中の計画 | 実装中のみ | ⭐⭐ |
| `backlog/` | 検討・調査・保留タスク | 随時 | ⭐ |
| `archive/` | 過去資料（参照のみ） | なし（読み取り専用） | ⭐ |

### 参照すべきドキュメント

実装・技術選定時に必ず参照：

1. `docs/specs/` - 技術仕様
2. `docs/lessons/` - 過去の教訓
3. `docs/plans/` - 現在のタスク

```bash
# 検索コマンド例
grep -r "LangChain" docs/lessons/ --include="*.md"  # 過去のLangChain関連の教訓
grep -r "ストリーミング" docs/lessons/ --include="*.md"  # ストリーミング関連の知見
```

---

## 🚨 報告条件（作業は止めずに報告）

以下のいずれかに該当する場合は**作業を続けながら**ユーザーに報告する。

- [ ] 同一ファイルへの修正が3回を超えた（進捗報告）
- [ ] npm install が必要になった（並行処理で進める）
- [ ] セキュリティ関連の設定（認証・CORS・シークレット）を変更する必要が出た（意図確認）
- [ ] タスクスコープ外のファイルを変更しないとビルドが通らない（方針確認）
- [ ] `as any` を使わないと解決できない型エラーが発生した（一時対応の報告）
- [ ] 実装中に大きな設計変更が必要になった（計画書更新の確認）
- [ ] 保留タスク・イシューを発見した（backlog/ への記録報告）
- [ ] **新しい知見・教訓を発見した（lessons/ への追加提案）**

**基本方針: 報告しつつ作業を進める。中断はしない。**
