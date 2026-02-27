# CIエラー修正スキル

GitHub ActionsなどのCIで発生したエラーを効率的に修正するためのスキル。

## 最重要原則

1. **推測で決めつけない** - 必ずログを確認して原因を特定する
2. **一度で直そうとしない** - 小さく修正して、ログを確認し、次に進む
3. **ステップバイステップ** - ログ確認 → 修正 → ログ確認 → 修正 → を繰り返す

## ワークフロー（反復的アプローチ）

### Step 1: エラーログを取得する

```bash
# TypeScriptエラーの場合
npx tsc --noEmit 2>&1

# 最初の数件だけ確認
npx tsc --noEmit 2>&1 | head -20
```

**この時点で考えないこと：**
- ❌ "おそらくこういう原因だろう"
- ❌ "以前同じようなエラーがあったから"
- ✅ **ただ事実（エラーメッセージ）を確認するだけ**

### Step 2: 最初の1エラーを調査する

**複数エラーがある場合、最初の1つだけに集中する。**

```bash
# 最初のエラーだけを確認
npx tsc --noEmit 2>&1 | grep -m1 "error TS"
```

**調査のポイント：**
- どのファイルの何行目か
- エラーコードは何か（TS2339など）
- エラーメッセージの具体的な内容

### Step 3: 該当コードを確認する

```bash
# エラーが出たファイルを開く
# 例: app/api/chat/feature/route.ts(90,24)
```

**確認すること：**
- その行で何をしようとしているか
- 型定義は何か（型定義ファイルやJSDocを確認）
- 周辺のコードの文脈

### Step 4: 1エラーを修正する

**最小限の修正のみ行う。**

```typescript
// 例: Property 'llmProvider' does not exist on type 'Message'
// → 型定義を確認して、存在するプロパティ名を使用
```

### Step 5: 再度ログを確認する

```bash
# 修正後、再度チェック
npx tsc --noEmit 2>&1 | head -20
```

**結果を見て判断：**
- ✅ エラーが減った → 次のエラーへ
- ❌ エラーが変わった → 新しいエラーを調査
- ❌ 同じエラーが残っている → 修正が不十分、Step 2に戻る

### Step 6: 繰り返す

エラーが0になるまで Step 2〜5 を繰り返す。

---

## エラー種別ごとの調査方法

### TypeScriptエラー

```bash
# 全エラーを確認
npx tsc --noEmit 2>&1

# エラー数をカウント
npx tsc --noEmit 2>&1 | grep -c "error TS"

# 最初のエラーだけ
npx tsc --noEmit 2>&1 | grep -m1 "error TS"
```

### Lintエラー

```bash
# エラーを確認
npm run lint 2>&1

# 自動修正を試す（慎重に）
npx biome check --write <特定のファイル> 2>&1
```

### Testエラー

```bash
# 失敗したテスト名
npm test 2>&1 | grep "✕\|FAIL"

# 特定のテストのみ実行
npm test <テスト名> 2>&1
```

---

## よくあるエラーと調査方法

### ケース1: Property 'xxx' does not exist on type 'YYY'

**調査：**
```bash
# 型定義を確認
grep -r "interface YYY\|type YYY" --include="*.ts" --include="*.d.ts"

# または定義ジャンプで確認
```

**修正：**
- 型定義に存在しないプロパティ → 削除または正しいプロパティ名に変更
- 型定義が古い → 型定義を更新

### ケース2: Argument of type 'XXX' is not assignable to parameter of type 'YYY'

**調査：**
- 関数の型定義を確認
- 渡している値の型を確認
- 型変換が必要か判断

### ケース3: Unused variable/parameter

**調査：**
- 本当に未使用か確認
- 将来使う予定か確認

**修正：**
- 未使用 → 削除
- 将来使う → `_` プレフィックスを付ける

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

## 禁止事項

1. **推測で修正しない**
   ```
   ❌ "おそらくこの型だろう" → 調査せずに修正
   ✅ エラーメッセージを確認 → 型定義を調査 → 修正
   ```

2. **一度で全部直そうとしない**
   ```
   ❌ 10個のエラーを一気に修正してから確認
   ✅ 1個修正 → 確認 → 次の1個修正 → 確認
   ```

3. **型安全性を犠牲にしない**
   ```
   ❌ `as any` でごまかす
   ✅ 正しい型を調査して修正
   ```

---

## コミット戦略

1. **1エラー修正ごとにコミットしてもよい**
   - 小さく確実に進める
   - やり直しが容易

2. **コミットメッセージ**
   ```
   fix: TypeScriptエラーを修正 - Message型のプロパティ名を修正
   
   - llmProvider → provider に修正
   - 型定義と実装の不一致を解消
   ```

---

## トラブルシューティング

### CIでは失敗するがローカルでは通る

```bash
# 1. 依存関係を最新に
rm -rf node_modules package-lock.json
npm install

# 2. キャッシュをクリア
rm -rf .next dist

# 3. 再度チェック
npx tsc --noEmit 2>&1 | head -20
```

### エラーが多すぎて混乱する

```bash
# 最初の1つだけに集中
tsc_output=$(npx tsc --noEmit 2>&1)
first_error=$(echo "$tsc_output" | grep -m1 "error TS")
echo "修正対象: $first_error"
```

### 原因がわからない

```bash
# エラーコードで検索
grep -r "TS2339" docs/ --include="*.md"
grep -r "TS2345" docs/ --include="*.md"
```

---

## まとめ

**反復的アプローチ：**

```
ログ確認 → 1エラー調査 → 修正 → ログ確認 → 次のエラー → ... → 0エラー
```

**キーワード：**
- 推測禁止
- ステップバイステップ
- ログを信じる
- 小さく確実に
