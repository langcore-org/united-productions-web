# AGENTS.md - 開発ガイドライン

## コミット前の必須チェック

コード変更後は、必ず以下のテストを実行してからコミットしてください：

### 1. リントチェック
```bash
npm run lint
```

### 2. ユニットテスト
```bash
npm run test
```

### 3. ビルドテスト
```bash
npm run build
```

### 4. E2Eテスト（必要に応じて）
```bash
npm run test:e2e
```

## 推奨ワークフロー

```bash
# 1. リントとビルドを実行
npm run lint && npm run build

# 2. テストを実行
npm run test

# 3. すべて成功したらコミット
git add .
git commit -m "your message"
```

## 注意事項

- すべてのチェックが通るまでコミットしないでください
- エラーが発生した場合は、修正して再テストしてください
- E2Eテストは時間がかかるため、重要な変更時のみ実行してください
