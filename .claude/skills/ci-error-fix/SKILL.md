# CIエラー修正スキル

GitHub ActionsなどのCIで発生したエラーを効率的に修正するためのスキル。

## 使用タイミング

- GitHub Actionsでビルド/テスト/リントが失敗した時
- PR作成後にCIが失敗した時
- ローカルでは通るがCIで失敗する時

## 基本ワークフロー

### 1. エラーの詳細を確認する

**必ずログを確認してから修正を始めること。**

```bash
# ローカルで各チェックを実行
npm run build 2>&1
npx tsc --noEmit 2>&1
npm run lint 2>&1
npm test 2>&1
```

### 2. エラーの種類を特定する

| エラー種別 | 確認コマンド | 対応方法 |
|-----------|------------|---------|
| TypeScript | `npx tsc --noEmit` | 型定義を修正 |
| Lint | `npm run lint` | コードスタイルを修正 |
| Test | `npm test` | テストコードまたは実装を修正 |
| Build | `npm run build` | ビルド設定またはコードを修正 |

### 3. エラーの原因を特定する

#### TypeScriptエラーの場合

```bash
# エラーが出たファイルを確認
npx tsc --noEmit 2>&1 | grep "error TS"

# 特定のエラーの詳細を確認
npx tsc --noEmit 2>&1 | head -50
```

よくある原因：
- 存在しないプロパティへのアクセス
- 型の不整合
- 未使用の変数/インポート
- Propsの型定義と実際の使用が不一致

#### Lintエラーの場合

```bash
# エラーが出たファイルを確認
npm run lint 2>&1 | grep "error"

# 自動修正可能か確認
npx biome check --write . 2>&1
```

#### Testエラーの場合

```bash
# 失敗したテスト名を確認
npm test 2>&1 | grep "FAIL\|✕"

# 詳細なエラーメッセージ
npm test 2>&1 | tail -100
```

### 4. 修正する

#### 型エラーの修正パターン

**パターン1: 存在しないプロパティ**
```typescript
// ❌ エラー
const provider = message.llmProvider;

// ✅ 修正：型定義を確認し、正しいプロパティ名を使用
const provider = message.llmProvider; // 型定義に存在するか確認
```

**パターン2: 未使用の変数**
```typescript
// ❌ エラー
const unusedVar = something;

// ✅ 修正：使用しない場合は削除、または_プレフィックス
const _unusedVar = something;
```

**パターン3: Propsの不一致**
```typescript
// ❌ 親コンポーネントで渡しているが子で使用していない
<ChildComponent unusedProp={value} />

// ✅ 修正：子コンポーネントのPropsから削除
interface ChildProps {
  // unusedProp: string; // 削除
}
```

### 5. 修正を確認する

```bash
# 修正後、再度チェック
npm run build 2>&1 | tail -5
npx tsc --noEmit 2>&1 | tail -5
npm run lint 2>&1 | tail -5
```

## トラブルシューティング

### CIでは失敗するがローカルでは通る

```bash
# 1. 依存関係を最新に
rm -rf node_modules package-lock.json
npm install

# 2. キャッシュをクリア
npm run clean 2>/dev/null || rm -rf .next dist

# 3. 再度実行
npm run build
```

### エラーメッセージが不明確

```bash
# より詳細な出力
npx tsc --noEmit --pretty 2>&1

# 特定のファイルのみチェック
npx tsc --noEmit --project tsconfig.json 2>&1 | grep "app/path/to/file"
```

### 大量のエラーが出た場合

1. **最初のエラーから修正する** - 連鎖的なエラーの可能性あり
2. **共通の原因を探す** - 型定義の変更が影響している場合など
3. **分割して対応** - ファイルごとにコミット

## スクリプト

### ci-check.sh - ローカルでCIチェックを再現

```bash
./.claude/skills/ci-error-fix/scripts/ci-check.sh
```

### find-ts-errors.sh - TypeScriptエラーの場所を特定

```bash
./.claude/skills/ci-error-fix/scripts/find-ts-errors.sh
```

## コミットメッセージのテンプレート

```
fix: CIエラーを修正

- TypeScript: XXXの型定義を修正
- Lint: XXXのスタイルを修正
- Test: XXXのテストを修正
```

## 重要な注意事項

1. **推測で修正しない** - 必ずエラーログを確認する
2. **最小限の修正** - 必要最小限の変更に留める
3. **型安全性を損なわない** - `as any` は最後の手段
4. **テストも確認** - 型エラー修正後、テストが通るか確認
