# CIエラー修正スキル（GitHub Actions対応）

GitHub Actionsで発生したエラーを効率的に修正するためのスキル。

## 最重要原則

1. **推測で決めつけない** - 必ずGitHub Actionsのログを確認して原因を特定する
2. **一度で直そうとしない** - 小さく修正して、再度CIを実行し、次に進む
3. **ステップバイステップ** - ログ確認 → 修正 → CI実行 → ログ確認 → を繰り返す

---

## ワークフロー（反復的アプローチ）

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

### Step 4: エラーを修正する

**エラーの性質に応じて、1つまたはまとめて修正する。**

```typescript
// 例: GitHub Actionsのログで確認したエラー
// app/api/chat/feature/route.ts(90,24): error TS2339: Property 'llmProvider' does not exist on type 'Message'

// → 型定義ファイルを確認して、正しいプロパティ名を使用
// → 同じプロパティ名を使っている他の箇所もまとめて修正
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

### Step 6: コミットしてGitHub Actionsを実行する

```bash
# 修正をコミット
git add <修正したファイル>
git commit -m "fix: TypeScriptエラーを修正 - XXXのプロパティ名を修正"

# PushしてCIを実行
git push origin main
```

### Step 7: GitHub Actionsの結果を確認する

```bash
# gh CLIで最新の実行を監視
gh run watch --repo=owner/repo

# またはWeb界面で確認
```

**結果を見て判断：**
- ✅ 成功 → 完了
- ❌ 失敗 → ログを確認し、Step 1に戻る

---

## GitHub Actionsログの見方

### よくあるステップの失敗

| ステップ名 | エラー内容 | 対応コマンド |
|-----------|----------|------------|
| Lint | style/formatエラー | `npm run lint` |
| Type Check | TypeScriptエラー | `npx tsc --noEmit` |
| Test | テスト失敗 | `npm test` |
| Build | ビルド失敗 | `npm run build` |

### ログの探し方

**エラーの始まりを探す：**
```
# 赤文字や「error」「FAIL」で検索
# 通常、最初のエラーが原因
```

**ファイルパスと行番号に注目：**
```
app/api/chat/feature/route.ts(90,24)
                      ↑ファイル   ↑行番号,列番号
```

---

## エラー種別ごとの調査方法

### TypeScriptエラー（error TSxxxx）

```bash
# ローカルで確認
npx tsc --noEmit 2>&1

# エラー数をカウント
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

### Lintエラー

```bash
# ローカルで確認
npm run lint 2>&1

# 自動修正を試す（1ファイルずつ）
npx biome check --write <特定のファイル> 2>&1
```

### Testエラー

```bash
# 特定のテストのみ実行
npm test <テスト名パターン> 2>&1
```

---

## よくあるパターンと調査方法

### パターン1: Property 'xxx' does not exist on type 'YYY'

**GitHub Actionsログでの確認：**
```
app/api/chat/feature/route.ts(90,24): error TS2339: Property 'llmProvider' does not exist on type 'Message'
```

**調査：**
```bash
# 型定義を確認
grep -r "interface Message\|type Message" lib/ --include="*.ts"

# または該当ファイルを開いて型定義を確認
```

**修正：**
- 型定義に存在しないプロパティ → 削除または正しいプロパティ名に変更
- 型定義が古い → 型定義を更新

### パターン2: CIでは失敗するがローカルでは通る

**調査：**
```bash
# 1. Node.jsバージョンを確認
node -v
cat .nvmrc  # CIで使用されているバージョン

# 2. 依存関係を最新にして再現
rm -rf node_modules package-lock.json
npm install
npx tsc --noEmit 2>&1 | head -20
```

---

## 禁止事項

1. **推測で修正しない**
   ```
   ❌ GitHub Actionsのログを見ずに"おそらくこうだろう"と修正
   ✅ GitHub Actionsのログ → ローカル再現 → 修正
   ```

2. **適切な粒度で修正する**
   ```
   ❌ 理由もわからずに大量のファイルを一気に修正
   ✅ 同じ原因のエラーはまとめて修正 → CI確認
   ✅ 原因が不明確なら1つずつ修正 → CI確認
   ```

3. **CI結果を確認せずに次に進まない**
   ```
   ❌ Pushして終わり
   ✅ Push → GitHub Actionsの結果を確認 → 成功/失敗を確認
   ```

---

## コミット戦略

1. **1エラー修正ごとにコミット・Pushしてもよい**
   - 小さく確実に進める
   - CIの結果をすぐに確認できる

2. **コミットメッセージ**
   ```
   fix: TypeScriptエラーを修正 - Message型のプロパティ名を修正
   
   GitHub Actionsのログで確認したエラー:
   - error TS2339: Property 'llmProvider' does not exist on type 'Message'
   - llmProvider → provider に修正
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
GitHub Actionsログ確認 → ローカル再現 → 1エラー調査 → 修正 → 
ローカル確認 → コミット・Push → GitHub Actions結果確認 → 
（失敗なら最初に戻る / 成功なら完了）
```

**キーワード：**
- GitHub Actionsのログを最初に確認
- 推測禁止
- 適切な粒度で修正（1つずつまたはまとめて）
- ステップバイステップ
