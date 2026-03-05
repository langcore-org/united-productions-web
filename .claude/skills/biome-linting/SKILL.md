---
name: biome-linting
description: Biomeによる高速なリントとフォーマット。コード品質の維持と自動修正をサポート。
---

# Biome Linting

## Description
Biome を使用して高速なリントとフォーマットを行い、コード品質を維持するためのスキル。

## When to use
- コードの品質チェック時
- 自動フォーマット適用時
- CIでのLintエラー対応時
- コミット前の品質確認時

## Available Commands

```bash
# リントチェック（問題を検出のみ）
npm run lint

# リント問題の自動修正
npm run lint:fix

# フォーマット適用
npm run format
```

## Configuration

設定ファイル: `biome.json`

| 設定項目 | 値 | 説明 |
|---------|-----|------|
| インデント | 2 spaces | スペース2つでインデント |
| 行幅 | 100文字 | 1行の最大文字数 |
| 引用符 | double | ダブルクォートを使用 |
| セミコロン | always | 文末セミコロンを必須 |
| import整理 | on | 自動でimportを整理 |

## Target Files

以下のディレクトリが対象:
- `app/**`
- `lib/**`
- `components/**`
- `tests/**`
- `types/**`
- `hooks/**`
- `prisma/**`
- `scripts/**`
- `config/**`

## Common Tasks

### 特定ファイルのリントチェック
```bash
npx biome check app/page.tsx
```

### 特定ファイルの自動修正
```bash
npx biome check --write app/page.tsx
```

### フォーマットのみ実行
```bash
npx biome format --write .
```

## Git Hooks Integration

Lefthook で pre-commit フックとして実行:

```yaml
# lefthook.yml
pre-commit:
  commands:
    check:
      glob: "*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}"
      run: npx biome check --no-errors-on-unmatched --files-ignore-unknown=true {staged_files}
```

## CI Error Handling

### 一般的なエラー対応

1. **リントエラーの修正**
   ```bash
   npm run lint:fix
   ```

2. **フォーマットエラーの修正**
   ```bash
   npm run format
   ```

3. **両方同時に修正**
   ```bash
   npm run lint:fix && npm run format
   ```

### 無視コメント（一時的な対応のみ）

```typescript
// biome-ignore lint/suspicious/noExplicitAny: 理由を記載
const x: any = ...;

// biome-ignore format: 理由を記載
const matrix = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1
];
```

## Best Practices

1. **保存時に自動フォーマット** - VS Code拡張機能を使用
2. **コミット前に必ず `lint:fix`** - 自動修正で解決できる問題は自動化
3. **無視コメントは最小限に** - 理由を明確に記載し、技術的負債として管理
4. **CIエラーは直ちに修正** - 放置すると後で手間が増大

## Troubleshooting

| 問題 | 解決方法 |
|-----|---------|
| `biome.json` not found | 設定ファイルが存在するか確認 |
| 無視したいルール | `biome.json` の `rules` セクションを編集 |
| ファイルが対象外 | `files.includes` にパターンを追加 |

## References

- [Biome Documentation](https://biomejs.dev/)
- [Configuration Reference](https://biomejs.dev/reference/configuration/)
- [Lint Rules](https://biomejs.dev/linter/rules/)
