---
name: biome-linting
description: Biomeによる高速なリントとフォーマット。コード品質の維持と自動修正をサポート。ユーザーが「lint」「フォーマット」「コード整形」「CIエラー」「import整理」などに関する質問や要望をした時に使用。
---

# Biome Linting

Biome を使用して高速なリントとフォーマットを行い、コード品質を維持するためのスキル。

## When to use

- 「lint」「フォーマット」「コード整形」などの発言時
- 「CIエラー」「ビルドエラー」でlint関連のエラーが出た時
- 「importを整理したい」などの発言時
- コードスタイルの統一が必要な時
- コミット前の品質チェック時
- 「as anyを使わない方法」などの型安全性に関する質問時

## Quick Start

```bash
# リントチェック（問題を検出のみ）
npm run lint

# 自動修正
npm run lint:fix

# フォーマット適用
npm run format

# コミット前チェック（推奨）
npm run lint && npm run build
```

## Available Commands

| コマンド | 用途 |
|---------|------|
| `npm run lint` | リントチェック（検出のみ） |
| `npm run lint:fix` | リント問題の自動修正 |
| `npm run format` | フォーマット適用 |
| `npx biome check app/page.tsx` | 特定ファイルのチェック |
| `npx biome check --write app/page.tsx` | 特定ファイルの修正 |

## Configuration

設定ファイル: `biome.json`

| 設定項目 | 値 | 説明 |
|---------|-----|------|
| インデント | 2 spaces | スペース2つでインデント |
| 行幅 | 100文字 | 1行の最大文字数 |
| 引用符 | double | ダブルクォートを使用 |
| セミコロン | always | 文末セミコロンを必須 |
| import整理 | on | 自動でimportを整理 |

### 対象ファイル

```json
{
  "files": {
    "includes": [
      "app/**",
      "lib/**",
      "components/**",
      "tests/**",
      "types/**",
      "hooks/**",
      "scripts/**"
    ]
  }
}
```

## 対話例：よくあるシナリオ

### シナリオ1: CIでLintエラーが出た

```
ユーザー: 「CIが落ちてるみたい。見てもらえる？」

AI: 「CIのログを確認します。エラーの種類を特定しますね。」

[GitHub Actionsのログを確認]

AI: 「Lintエラーが出ていますね。ローカルで確認して修正します。

```bash
npm run lint
```

実行してみます。」

[lintエラーを確認]

AI: 「以下のエラーが出ています：
- app/page.tsx: セミコロンが欠けている
- lib/utils.ts: importの並び順が不正

自動修正を実行しますか？

```bash
npm run lint:fix
```

→ 「はい」

AI: 「修正しました。修正内容を確認します：

```diff
// app/page.tsx
- const x = 1
+ const x = 1;

// lib/utils.ts
- import { a } from 'a'
- import { b } from 'b'
+ import { b } from 'b'
+ import { a } from 'a'
```

コミットしてCIを再実行しましょうか？」
```

### シナリオ2: importを整理したい

```
ユーザー: 「importがごちゃごちゃしてるから整理したい"

AI: 「importを自動整理します。以下のコマンドを実行します：

```bash
npx biome check --write .
```

これで：
- 未使用のimportが削除されます
- importの並び順が整理されます
- 重複したimportが統合されます

実行してよろしいでしょうか？」

→ 「はい」

AI: 「整理が完了しました。変更内容を確認してください：

[変更されたファイル一覧]

- app/page.tsx: 3つの未使用importを削除
- components/Button.tsx: import順序を整理

問題なければコミットしてください。」
```

### シナリオ3: 特定ファイルだけチェックしたい

```
ユーザー: 「app/api/chat/route.ts のlintだけ確認したい"

AI: 「特定ファイルのlintチェックを実行します：

```bash
npx biome check app/api/chat/route.ts
```

結果：
✅ エラーはありませんでした。

または、自動修正も試しますか？」
```

## チェックリスト

### コミット前チェックリスト

```markdown
## コミット前チェック

- [ ] `npm run lint` がエラーなく通る
- [ ] `npm run build` が成功する
- [ ] `as any` を使っていない（または正当化している）
- [ ] importが整理されている
```

### CIエラー対応チェックリスト

```markdown
## CI Lintエラー対応

1. [ ] エラーログを確認し、エラーの種類を特定
2. [ ] ローカルで `npm run lint` を実行して再現
3. [ ] `npm run lint:fix` で自動修正を試行
4. [ ] 自動修正できないエラーを手動で修正
5. [ ] 再度 `npm run lint` で確認
6. [ ] コミットしてCIを再実行
```

## 無視コメント（一時的な対応のみ）

```typescript
// biome-ignore lint/suspicious/noExplicitAny: ライブラリの型定義が不完全なため
const x: any = ...;

// biome-ignore format: 行列を揃えるため手動整形
const matrix = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1
];
```

> ⚠️ **注意**: 無視コメントは一時的な対応として使用し、技術的負債として `docs/backlog/` に記録すること。

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

## Troubleshooting

| 問題 | 解決方法 |
|-----|---------|
| `biome.json` not found | 設定ファイルが存在するか確認 |
| 無視したいルール | `biome.json` の `rules` セクションを編集 |
| ファイルが対象外 | `files.includes` にパターンを追加 |
| `Unknown variant` エラー | Biomeのバージョンを確認 |

## Best Practices

1. **保存時に自動フォーマット** - VS Code拡張機能を使用
2. **コミット前に必ず `lint:fix`** - 自動修正で解決できる問題は自動化
3. **無視コメントは最小限に** - 理由を明確に記載し、技術的負債として管理
4. **CIエラーは直ちに修正** - 放置すると後で手間が増大

## References

- [Biome Documentation](https://biomejs.dev/)
- [Configuration Reference](https://biomejs.dev/reference/configuration/)
- [Lint Rules](https://biomejs.dev/linter/rules/)
