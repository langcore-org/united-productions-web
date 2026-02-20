# 開発ワークフロー標準

> **開発作業の標準的な進め方と規約**
> 
> **最終更新**: 2026-02-20 13:16

---

## 🌿 ブランチ戦略

### ブランチ命名規則

```
{タイプ}/{簡潔な説明}
```

| タイプ | 用途 | 例 |
|-------|------|-----|
| `feature` | 新機能開発 | `feature/word-export` |
| `fix` | バグ修正 | `fix/sidebar-collapse-state` |
| `refactor` | リファクタリング | `refactor/api-error-handling` |
| `docs` | ドキュメント更新 | `docs/api-spec-update` |
| `chore` | 雑務（依存関係更新等）| `chore/update-deps` |

### ブランチ作成フロー

```bash
# 1. mainブランチを最新に
 git checkout main
 git pull origin main

# 2. 作業ブランチを作成
 git checkout -b feature/new-feature-name

# 3. 作業完了後、プッシュ
 git push -u origin feature/new-feature-name
```

---

## 📝 コミットメッセージ規約

### 形式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### タイプ

| タイプ | 説明 |
|-------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみの変更 |
| `style` | コードの意味に影響しない変更（フォーマット等）|
| `refactor` | リファクタリング |
| `perf` | パフォーマンス改善 |
| `test` | テスト追加・修正 |
| `chore` | ビルドプロセスや補助ツールの変更 |

### スコープ

| スコープ | 対象 |
|---------|------|
| `api` | APIエンドポイント |
| `ui` | UIコンポーネント |
| `db` | データベース・Prisma |
| `auth` | 認証関連 |
| `llm` | LLM連携 |
| `specs` | 仕様ドキュメント |

### 例

```
feat(api): 議事録作成APIにバリデーション追加

- Zodスキーマで入力検証を実装
- エラーメッセージを日本語化
- テストケースを追加

Closes #123
```

```
fix(ui): サイドバーの折りたたみ状態が保持されない問題を修正

- localStorageに状態を永続化
- 初期レンダリング時のちらつきを防止

Fixes #456
```

---

## 🔀 プルリクエスト

### PRテンプレート

```markdown
## 変更概要
<!-- 変更の概要を1-2文で記載 -->

## 変更種別
- [ ] 新機能
- [ ] バグ修正
- [ ] リファクタリング
- [ ] ドキュメント更新
- [ ] その他

## 影響範囲
<!-- 変更が影響する範囲を記載 -->

## テスト実施内容
- [ ] 単体テスト実行済み
- [ ] 統合テスト実行済み
- [ ] E2Eテスト実行済み
- [ ] 手動テスト実施済み

## スクリーンショット
<!-- UI変更がある場合は添付 -->

## 関連Issue
Closes #123
```

### PR作成時のチェックリスト

- [ ] コンフリクトがないことを確認
- [ ] CIが全てパスしていることを確認
- [ ] レビュアーを適切にアサイン
- [ ] ラベルを付与（`feature`, `bug`, `urgent`等）

---

## 👥 並列開発（Agent Swarm）

### 基本方針

詳細: [parallel-development.md](./parallel-development.md)

```
原則: 「依存関係が解決できれば即座に開始」
      「並列で最大限進めて早く完成させる」
```

### タスク分割の基準

| 粒度 | 目標時間 | 例 |
|-----|---------|-----|
| 小 | 30分〜1時間 | ユーティリティ関数の追加 |
| 中 | 1〜2時間 | コンポーネントの実装 |
| 大 | 2〜4時間 | APIエンドポイントの実装 |

### 並列開発時の注意点

1. **ファイル競合を避ける**
   - 同じファイルを編集する場合は事前に調整
   - 共通部分は先に完了させる

2. **ログ記録の徹底**
   ```markdown
   [INIT] タスク開始: feature-word-export
   [PROGRESS] 50% - Word変換ロジック実装中
   [ARTIFACT] 作成: lib/export/word.ts
   [COMPLETE] タスク完了
   ```

3. **即座にコミット**
   ```bash
   # 小さな単位でコミット
   git add lib/export/word.ts
   git commit -m "feat(lib): Word変換の基本実装"
   ```

---

## 🔄 開発サイクル

### 1. タスク着手前

```markdown
## 変更予定ファイル
- app/api/export/word/route.ts（新規）
- lib/export/word.ts（新規）
- components/ui/WordExportButton.tsx（新規）

## 変更しないファイル
- それ以外すべて（既存エラーは別対応）
```

### 2. 開発中

```bash
# 型チェック（頻繁に実行）
npx tsc --noEmit

# Lint確認
npm run lint

# テスト実行
npm run test
```

### 3. コミット前

```bash
# 最終チェック
npx tsc --noEmit && npm run lint && npm run test

# 新規 as any がないことを確認
 git diff --staged | grep "as any"
```

### 4. レビュー対応

- レビューコメントには必ず返信
- 修正は別コミットとして積み上げ
- 大きな変更は事前に相談

---

## 🏷️ リリース管理

### バージョニング

セマンティックバージョニングに従う:

```
{メジャー}.{マイナー}.{パッチ}

例: 1.2.3
```

| バージョン | 更新タイミング |
|-----------|--------------|
| メジャー | 破壊的変更を含むリリース |
| マイナー | 後方互換性のある機能追加 |
| パッチ | バグ修正 |

### リリースフロー

```bash
# 1. リリースブランチ作成
 git checkout -b release/v1.2.0

# 2. バージョン更新
# package.json の version を更新

# 3. リリースノート作成
# docs/releases/v1.2.0.md

# 4. PR作成・マージ

# 5. タグ付け
 git tag -a v1.2.0 -m "Release version 1.2.0"
 git push origin v1.2.0
```

---

## 📊 進捗管理

### タスクステータス

| ステータス | 説明 |
|-----------|------|
| `todo` | 未着手 |
| `in_progress` | 開発中 |
| `review` | レビュー待ち |
| `testing` | テスト中 |
| `done` | 完了 |

### ブロッカー管理

ブロッカー発生時は即座に報告:

```markdown
[BLOCKED] タスク名

原因: 依存するAPIが未実装
影響: フロントエンド実装が進められない
対応: API実装完了を待機
```

---

## 🔗 関連ドキュメント

| 項目 | 参照先 |
|-----|--------|
| 並列開発ガイド | [./parallel-development.md](./parallel-development.md) |
| コードレビュー | [./code-review-checklist.md](./code-review-checklist.md) |
| 命名規約 | [./naming-conventions.md](./naming-conventions.md) |
| 人間の介入ポイント | [./human-checkpoints.md](./human-checkpoints.md) |
