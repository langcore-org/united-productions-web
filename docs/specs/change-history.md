# 変更履歴

> **システム全体の変更追跡と影響範囲管理**
> 
> **最終更新**: 2026-02-24 12:00

---

## 記録方針

### 記録対象

| 変更タイプ | 記録要否 | 例 |
|-----------|---------|-----|
| API変更 | ✅ 必須 | 新規エンドポイント、パラメータ変更 |
| DBスキーマ変更 | ✅ 必須 | テーブル追加、カラム変更 |
| 認証変更 | ✅ 必須 | 認証フロー変更、権限制御変更 |
| UI大幅変更 | ✅ 必須 | ページ構成変更、主要コンポーネント変更 |
| 依存パッケージ更新 | △ 重要時 | メジャーアップデート、セキュリティ修正 |
| 設定変更 | △ 重要時 | 環境変数追加、ビルド設定変更 |
| 軽微なバグ修正 | ❌ 不要 | 表示崩れ修正、軽微なロジック修正 |

### 記録形式

```markdown
## YYYY-MM-DD

### [カテゴリ] 変更概要

**変更内容:**
- 具体的な変更点

**影響範囲:**
- 影響を受けるファイル/機能

**移行作業:**
- 必要な作業（あれば）

**関連:**
- PR/Issue番号
- 関連ドキュメント
```

---

## 2026-02-24

### [アーキテクチャ] システムプロンプト生成の共通化

**変更内容:**
- `lib/knowledge/system-prompt.ts` を新規作成
  - プロンプト生成の共通ロジックを集約
  - `programs.ts` と `programs-simple.ts` の重複を排除
  - `companyToPromptText()`, `programToPromptTextSimple()`, `programToPromptTextDetailed()`
  - `createSingleProgramPromptBase()`, `createAllProgramsPromptBase()`, `createCompositeSystemPrompt()`
- `lib/llm/prompt-builder.ts` を新規作成
  - API用のプロンプト構築ロジックを共通化
  - `FEATURE_TO_PROMPT_KEY` マッピングで機能IDとプロンプトキーを紐付け
  - `buildSystemPrompt()` で番組情報と機能固有の指示を結合
- `app/api/llm/stream/route.ts` を修正
  - `featureId` パラメータを追加
  - 機能に応じたプロンプト切り替えを実装
- 番組情報プロンプトの制約を緩和
  - 「番組に関する情報以外は『番組情報に含まれていません』」を削除
  - 「前提知識として保持し、適切に回答」に変更

**影響範囲:**
- `lib/knowledge/programs.ts` - 共通化された関数を使用するように変更
- `lib/knowledge/programs-simple.ts` - 共通化された関数を使用するように変更
- `app/api/llm/stream/route.ts` - `prompt-builder.ts` を使用
- `lib/api/llm-client.ts` - `featureId` パラメータを追加
- `hooks/useLLMStream/index.ts` - `featureId` を受け取れるように変更
- `components/ui/FeatureChat.tsx` - `featureId` を送信するように変更

**移行作業:**
- DBプロンプトの更新（ツール使用指示を追加）
  ```bash
  npx prisma db execute --file scripts/update-research-prompts.sql
  ```

**関連:**
- ドキュメント: `docs/specs/api-integration/system-prompt-management.md`
- ドキュメント: `docs/specs/architecture/code-structure-overview.md`

---

## 2026-02-20

### [API] Word出力・ファイルアップロードAPI追加

**変更内容:**
- `POST /api/export/word` - MarkdownからWord変換
- `POST /api/upload` - テキストファイルアップロード・抽出

**影響範囲:**
- 新規: `app/api/export/word/route.ts`
- 新規: `app/api/upload/route.ts`
- 関連: `FeatureChat.tsx`（ボタン追加予定）

**関連:**
- 詳細: [api-changelog.md](./api-changelog.md)

---

### [Docs] 開発ガイドドキュメント追加

**変更内容:**
- トラブルシューティングガイド作成
- コードレビューチェックリスト作成
- 開発ワークフロー標準ドキュメント作成
- 命名規約ガイド作成
- API変更管理ドキュメント作成

**影響範囲:**
- 新規: `docs/guides/troubleshooting.md`
- 新規: `docs/guides/development/code-review-checklist.md`
- 新規: `docs/guides/development/workflow-standards.md`
- 新規: `docs/guides/development/naming-conventions.md`
- 新規: `docs/specs/api-changelog.md`

---

## 2026-02-19

### [UI] サイドバー改修

**変更内容:**
- 折りたたみ機能追加
- リサーチ機能のサブメニュー展開
- 履歴セクション追加

**影響範囲:**
- 変更: `components/layout/Sidebar.tsx`
- 関連: `app/(authenticated)/layout.tsx`

**関連:**
- 詳細: [../plans/current/sidebar-redesign.md](../plans/current/sidebar-redesign.md)

---

### [Spec] UI/UXガイドライン更新

**変更内容:**
- Grok/Kimi風デザインの完全実装
- カラーパレット定義
- アニメーション指針追加

**影響範囲:**
- 変更: `docs/guides/ui-ux-guidelines.md`

---

## 2026-02-18

### [API] LLMチャットAPI改良

**変更内容:**
- ストリーミングレスポンス対応
- プロバイダー選択機能追加
- トークン使用量記録

**影響範囲:**
- 変更: `app/api/llm/chat/route.ts`
- 変更: `app/api/llm/stream/route.ts`
- 新規: `lib/llm/clients/*.ts`

**移行作業:**
- `provider` パラメータを必須化（移行期間: 〜2026-03-15）

**関連:**
- 詳細: [api-changelog.md](./api-changelog.md)

---

## 2026-02-17

### [DB] SystemPromptテーブル追加

**変更内容:**
- プロンプトDB管理機能追加
- バージョン管理カラム追加

**影響範囲:**
- 変更: `prisma/schema.prisma`
- 新規: `lib/prompts/db.ts`
- マイグレーション: `2026021701_add_system_prompt`

**移行作業:**
```bash
npx prisma migrate deploy
```

---

## 2026-02-15

### [Release] v1.0.0 リリース

**変更内容:**
- 初期バージョンリリース
- 主要機能実装完了

**含まれる機能:**
- 認証システム（Google OAuth）
- 議事録作成
- 文字起こし整形
- NA原稿作成
- 管理画面

---

## 変更検索

### キーワード検索

```bash
# 特定の変更を検索
grep -r "keyword" docs/specs/change-history.md

# 日付範囲で検索
grep -A 20 "2026-02-20" docs/specs/change-history.md
```

### 影響範囲の確認

変更を行う前に、過去の類似変更を確認:

```bash
# API変更の履歴を確認
grep -B 2 -A 10 "\[API\]" docs/specs/change-history.md

# DB変更の履歴を確認
grep -B 2 -A 10 "\[DB\]" docs/specs/change-history.md
```

---

## 関連ドキュメント

| 項目 | 参照先 |
|-----|--------|
| API変更詳細 | [./api-changelog.md](./api-changelog.md) |
| タスク一覧 | [../plans/current/tasks-overview.md](../plans/current/tasks-overview.md) |
| 開発ログ | [../logs/](../logs/) |
