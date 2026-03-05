---
name: ci-error-fix
description: GitHub ActionsのCIエラーを段階的に修正。TypeScript、Lint、テストエラーの対応と、別作業ファイルを含めないコミット戦略をサポート。
---

# CIエラー修正スキル（GitHub Actions対応）

GitHub Actionsで発生したエラーを効率的に修正するためのスキル。

## 最重要原則

1. **推測で決めつけない** - 必ずGitHub Actionsのログを確認して原因を特定する
2. **一度で直そうとしない** - 小さく修正して、再度CIを実行し、次に進む
3. **ステップバイステップ** - ログ確認 → 修正 → CI実行 → ログ確認 → を繰り返す
4. **部分的成功でもコミット** - TypeScriptが通ったら一旦コミット、Lintは次で

---

## エラーの優先順位と並列処理

```
【修正順序】
1. 依存関係のエラー（Prismaなど）→ 最初に解決
2. TypeScript型エラー → 並列で修正可能
3. Lintエラー → 自動修正を活用
4. Testエラー → 実装変更を確認してから対応
```

---

## ワークフロー（反復的アプローチ）

### Step 0: 事前チェック - 依存関係の問題

**コード修正前に、依存関係の更新が必要か確認する：**

```bash
# Prismaの型エラーが出た場合
npx prisma generate

# Node.js組み込みモジュールのエラー（fs, pathなど）
# → importを 'node:fs' 形式に変更
find scripts -name "*.mjs" -exec sed -i 's/from "fs"/from "node:fs"/g' {} \;
find scripts -name "*.mjs" -exec sed -i 's/from "path"/from "node:path"/g' {} \;
find scripts -name "*.mjs" -exec sed -i 's/from "url"/from "node:url"/g' {} \;
```

### Step 1: GitHub Actionsのログを確認する

**GitHubのWeb界面またはgh CLIでログを確認する。**

```bash
# gh CLIで最新のワークフロー実行ログを確認
gh run view --repo=owner/repo --status=failure

# 特定のジョブのログを確認
gh run view <run-id> --job=<job-id> --log
```

**Web界面での確認方法：**
1. GitHubリポジトリ → Actionsタブ
2. 失敗したワークフローをクリック
3. 失敗したジョブをクリック
4. エラーメッセージが表示されているステップを確認

**確認するポイント：**
- どのステップで失敗したか（Build / Lint / Test / Type Check）
- 最初に出たエラーメッセージ
- エラーが出たファイルと行番号

**この時点で考えないこと：**
- ❌ "おそらくこういう原因だろう"
- ❌ "以前同じようなエラーがあったから"
- ✅ **ただ事実（ログに書かれている内容）を確認するだけ**

### Step 2: エラーをローカルで再現する

GitHub Actionsのログに基づき、ローカルで同じエラーを再現できるか確認する。

```bash
# エラー種別に応じてコマンドを実行

# TypeScriptエラーの場合
npx tsc --noEmit 2>&1 | head -20

# Lintエラーの場合
npm run lint 2>&1 | head -20

# Buildエラーの場合
npm run build 2>&1 | tail -50

# Testエラーの場合
npm test 2>&1 | grep -A5 "FAIL\|✕" | head -30
```

**ローカルで再現できない場合：**
- Node.jsバージョンの違い（`.nvmrc`や`package.json`の`engines`を確認）
- 環境変数の違い
- キャッシュの違い

### Step 3: エラーを調査する

**エラーの内容に応じて、1つずつまたはまとめて対応する。**

```bash
# エラー一覧を確認
npx tsc --noEmit 2>&1 | grep "error TS" | head -20

# 同じファイルでのエラーを確認
npx tsc --noEmit 2>&1 | grep "app/api/chat/feature"
```

**調査のポイント：**
- どのファイルの何行目か
- エラーコードは何か（TS2339など）
- **同じ原因で複数のエラーが出ていないか**

**まとめて修正できるケース：**
- 同じ型定義の変更による複数箇所のエラー
- 同じファイル内の関連するエラー
- リネームによる一連のエラー

**1つずつ修正するケース：**
- 原因が不明確なエラー
- 異なるファイルの独立したエラー
- 複雑な型の問題

### Step 4: エラーを修正する（並列処理の活用）

**エラーの性質に応じて、1つまたはまとめて修正する。**

#### パターン1: 複数ファイルに同じエラーがある場合

```bash
# 例: scripts/ 以下のすべてのファイルで同じimportエラー
find scripts -name "*.mjs" -exec sed -i 's/from "fs"/from "node:fs"/g' {} \;
find scripts -name "*.mjs" -exec sed -i 's/from "path"/from "node:path"/g' {} \;

# 例: 複数ファイルで未使用インポート
# biome check --write で一括修正
npx biome check --write scripts/
```

#### パターン2: 型定義関連のエラー

```bash
# エラーが出た型を検索
grep -r "interface Message\|type Message" lib/ --include="*.ts"

# または定義ジャンプで確認
```

**修正：**
- 型定義に存在しないプロパティ → 削除または正しいプロパティ名に変更
- 型定義が古い → 型定義を更新

#### 自動修正の活用

**安全に自動修正できるもの：**
```bash
# Lintスタイルの問題（インデント、セミコロンなど）
npx biome check --write .

# 特定のディレクトリのみ
npx biome check --write scripts/
```

**注意が必要なもの：**
```bash
# Unsafe fix（型の変更など）は個別に確認
npx biome check --write --unsafe  # 慎重に使用
```

### Step 5: ローカルで確認する

```bash
# 修正後、ローカルで確認
npx tsc --noEmit 2>&1 | head -20
```

**結果を見て判断：**
- ✅ エラーが減った → コミットしてPush、CIを実行
- ❌ エラーが変わった → 新しいエラーを調査（Step 3に戻る）
- ❌ 同じエラーが残っている → 修正が不十分、Step 3に戻る

### Step 6: コミットとPush（段階的コミット戦略）

**重要：部分的成功でもコミットする**

```bash
# Step 6a: 修正対象のみをステージング（別作業のファイルは含めない）
git status  # 変更ファイルを確認
git add <修正したファイルのみ>  # 特定のファイルを指定
git add -p  # または対話的に選択

# Step 6b: TypeScriptエラーだけ修正した場合
git commit -m "fix: TypeScriptエラーを修正

- Prismaの型定義を更新
- ZodスキーマのllmProviderを大文字に修正
- XAIStreamEventにdeltaプロパティを追加" --no-verify  # lintは後で

# Step 6c: PushしてCIを実行
git push origin main
```

**別作業のファイルを含めないためのチェック：**
```bash
# コミット前に確認
git diff --cached --stat  # ステージングされたファイル一覧
git diff --cached <file>  # 特定ファイルの差分確認

# 別作業のファイルが含まれていないか確認
# 例: docs/, .claude/skills/ などの変更は別コミットにする
```

### Step 7: GitHub Actionsの結果を確認する

```bash
# gh CLIで最新の実行を監視
gh run watch --repo=owner/repo

# またはWeb界面で確認
```

**結果を見て判断：**
- ✅ Type Check成功 → 次はLintエラーに進む
- ✅ 全て成功 → 完了
- ❌ 失敗 → ログを確認し、Step 1に戻る

### Step 8: 次のステップへ（段階的改善）

```bash
# TypeScriptが通ったら、次はLintを修正
npx biome check --write .
git add -A
git commit -m "style: Lintエラーを修正"
git push

# Lintが通ったら、最後にテストを確認
npm test 2>&1 | grep "FAIL\|✕"
# テスト失敗は実装変更に伴うものか確認
```

---

## CIエラー修正チェックリスト

- [ ] **Step 0**: 依存関係の更新が必要か確認（Prismaなど）
- [ ] **Step 1**: GitHub Actionsのログでエラー種別を確認
- [ ] **Step 2**: ローカルでエラーを再現
- [ ] **Step 3**: エラーを調査（同じ原因で複数エラーがないか）
- [ ] **Step 4**: エラーを修正（並列処理で効率化）
  - [ ] 複数ファイルに同じエラーがあれば一括修正
  - [ ] 自動修正（biome check --write）を活用
- [ ] **Step 5**: ローカルで `npx tsc --noEmit` が通るか確認
- [ ] **Step 6**: **修正対象のみ**をステージングしてコミット
  - [ ] `git status` で変更ファイルを確認
  - [ ] 別作業のファイルは含めない
- [ ] **Step 7**: CI結果を確認
- [ ] **Step 8**: 残りのエラー（Lint/Test）を段階的に修正

---

## コミット時の注意：別作業のファイルを含めない

### 確認コマンド

```bash
# 1. 現在の変更状況を確認
git status

# 2. ステージングされるファイルを確認（コミット前に必須）
git diff --cached --stat
git diff --cached --name-only

# 3. 別作業のファイルが含まれていないか確認
# 以下は通常、CIエラー修正に含めない：
# - docs/ (ドキュメント)
# - .claude/skills/ (スキルファイル)
# - scripts/ (調査スクリプト)
# - *.md (マークダウン)
```

### 部分ステージングの方法

```bash
# 方法1: 特定のファイルのみステージング
git add app/api/chat/feature/route.ts
git add components/ui/MessageBubble.tsx

# 方法2: 対話的に選択（推奨）
git add -p
# y: ステージング, n: スキップ, q: 終了

# 方法3: ディレクトリ単位でステージング
git add app/api/chat/
git add components/ui/*.tsx
```

### コミットメッセージのテンプレート

```
fix: TypeScriptエラーを修正

- Prismaクライアントを再生成
- ZodスキーマのllmProviderを大文字に修正
- XAIStreamEventにdeltaプロパティを追加
```

---

## よくある失敗パターンと対処

### 「修正したはずなのに同じエラー」
→ キャッシュが残っている可能性
```bash
rm -rf .next node_modules/.cache
npx prisma generate  # Prismaの場合
```

### 「ローカルでは通るがCIで失敗」
→ 環境差異を確認
```bash
# CIと同じNodeバージョンを使用
cat .nvmrc
```

### 「1つの修正が別のエラーを引き起こす」
→ 依存関係のあるエラー。コミットせずに連鎖修正を続行

### 「コミットに別作業のファイルが含まれた」
→ ステージングを解除してやり直し
```bash
# ステージングを解除
git reset HEAD <ファイル名>

# または全て解除して最初から
git reset HEAD
git add -p  # 対話的に選択
```

---

## スクリプト

### ci-check.sh - ローカルでCIチェックを実行

```bash
./.claude/skills/ci-error-fix/scripts/ci-check.sh
```

### find-ts-errors.sh - エラー分析

```bash
./.claude/skills/ci-error-fix/scripts/find-ts-errors.sh
```

---

## まとめ

**GitHub Actions対応の反復的アプローチ：**

```
依存関係チェック → GitHub Actionsログ確認 → ローカル再現 → 
エラー調査 → 修正（並列処理）→ ローカル確認 → 
修正対象のみステージング → コミット・Push → CI結果確認 → 
（成功なら次のステップ / 失敗なら最初に戻る）
```

**キーワード：**
- GitHub Actionsのログを最初に確認
- 推測禁止
- 適切な粒度で修正（1つずつまたはまとめて）
- 部分的成功でもコミット
- 別作業のファイルは含めない
