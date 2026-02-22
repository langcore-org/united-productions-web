# 未使用コード・リファクタリング対象調査レポート

> **調査日**: 2026-02-22  
> **ステータス**: 完了・保管  
> **対象プロジェクト**: Teddy (AI Hub)  
> **調査範囲**: 全TypeScript/TSXファイル

---

## 📋 概要

本レポートはコードベース全体を網羅的に調査し、以下を特定したものです：

1. **未使用ファイル** - 他からimportされていないファイル
2. **未使用エクスポート** - エクスポートされているが使用されていない関数・クラス・変数
3. **重複コード** - 同じ機能が複数箇所に実装されているもの
4. **リファクタリング推奨** - 改善すべきコード構造

---

## 🔴 高優先度：削除推奨（確信犯）

### 1. 未使用コンポーネントファイル

| ファイルパス | 理由 | 対応 |
|-------------|------|------|
| `components/layout/Header.tsx` | どこからもimportされていない | 削除 |
| `components/layout/SplitPaneLayout.tsx` | どこからもimportされていない | 削除 |
| `components/ui/AttachmentMenu.tsx` | どこからもimportされていない | 削除 |
| `components/meeting-notes/FileUploadChat.tsx` | どこからもimportされていない | 削除 |
| `components/icons/TeddyIcon.tsx` | Sidebarでコメントアウト済み、未使用 | 削除 |
| `components/ui/LLMSelector.tsx` | ModelSelectorと重複、未使用 | 削除 |
| `components/ui/ModelSelector.tsx` | 未使用 | 削除 |
| `components/ui/ExportButton.tsx` | 未使用 | 削除 |
| `components/ui/FeatureButtons.tsx` | 未使用 | 削除 |
| `components/ui/slider.tsx` | 未使用 | 削除 |
| `components/ui/switch.tsx` | 未使用 | 削除 |
| `components/LangChainChat.tsx` | テストページのみ使用、本番未使用 | 削除または統合 |

### 2. 未使用APIエンドポイント

| ファイルパス | エンドポイント | 理由 | 対応 |
|-------------|---------------|------|------|
| `app/api/llm/langchain/route.ts` | `/api/llm/langchain` | `/api/llm/chat`と完全重複 | 削除 |
| `app/api/llm/langchain/stream/route.ts` | `/api/llm/langchain/stream` | リエクスポートのみ、完全重複 | 削除 |
| `app/api/llm/rag/route.ts` | `/api/llm/rag` | フロントエンドから呼び出しなし | 削除または実装 |
| `app/api/llm/usage/route.ts` | `/api/llm/usage` | フロントエンドから呼び出しなし | 削除 |

### 3. 未使用ユーティリティファイル

| ファイルパス | 理由 | 対応 |
|-------------|------|------|
| `lib/env-check.ts` | エクスポート関数が未使用 | 削除 |
| `lib/markdown.ts` | エクスポート関数が未使用 | 削除 |
| `lib/parsers/document.ts` | エクスポート関数が未使用 | 削除 |

### 4. 未使用スクリプト・プロンプト

| ファイルパス | 理由 | 対応 |
|-------------|------|------|
| `scripts/check-prompts.ts` | package.json未登録、手動実行用 | 削除またはnpm scripts追加 |
| `scripts/test-langchain.ts` | package.json未登録 | 削除 |
| `scripts/verify-langchain-migration.sh` | package.json未登録 | 削除 |
| `prompts/meeting/default.md` | DB管理に移行済み、未使用 | 削除 |
| `prompts/meeting/interview.md` | 未使用 | 削除 |
| `prompts/research/*.md` | 未使用 | 削除 |
| `prompts/schedule/generate.md` | 未使用 | 削除 |
| `prompts/transcript/format.md` | 未使用 | 削除 |

### 5. 未使用型定義

| ファイルパス | 型名 | 対応 |
|-------------|------|------|
| `types/agent-thinking.ts` | `ComputerPanelState` | 削除 |
| `types/agent-thinking.ts` | `ThinkingProcessState` | 削除 |
| `types/agent-thinking.ts` | `ThinkingComponentProps` | 削除 |
| `types/export.ts` | `WordExportResponse` | 削除 |
| `types/upload.ts` | `FileValidationError` | 削除（`ParseError`と統合） |
| `types/upload.ts` | `FileUploadRequest` | 削除 |
| `types/upload.ts` | `FileUploadResponse` | 削除 |
| `types/upload.ts` | `SupportedFileType` | 削除 |

### 6. 未使用Prismaモデル

| モデル名 | 理由 | 対応 |
|---------|------|------|
| `LocationSchedule` | コードから参照なし（ロケスケ機能削除済み） | 削除 |

---

## 🟡 中優先度：統合・リファクタリング推奨

### 1. 機能重複（統合検討）

#### 議事録機能の重複
```
問題: 議事録機能が2箇所に実装されている
- app/(authenticated)/meeting-notes/page.tsx (640行の独立実装)
- /chat?gem=minutes (ChatPageコンポーネント使用)

推奨: meeting-notesページを /chat?gem=minutes にリダイレクト
      または統合チャットに機能を完全移行
```

#### NA原稿機能の重複
```
問題: NA原稿機能が2箇所に実装されている
- app/(authenticated)/transcripts/page.tsx (582行の独立実装)
- /chat?gem=na-script (ChatPageコンポーネント使用)

推奨: transcriptsページを /chat?gem=na-script にリダイレクト
      または統合チャットに機能を完全移行
```

#### リサーチ機能の重複
```
問題: リサーチ機能が複数実装されている
- /research (ResearchChatコンポーネント使用)
- /chat?gem=research-* (ChatPageコンポーネント使用)

推奨: 統合検討。Sidebarからは /chat?gem=research-* へ直接遷移
```

### 2. レイアウト重複

```
問題: 以下のlayout.tsxが (authenticated)/layout.tsx と重複
- app/(authenticated)/meeting-notes/layout.tsx
- app/(authenticated)/research/layout.tsx
- app/(authenticated)/transcripts/layout.tsx

推奨: 個別layout.tsxを削除し、親の (authenticated)/layout.tsx のみ使用
```

### 3. 関数・定数の重複

| 重複項目 | ファイル1 | ファイル2 | 推奨 |
|---------|----------|----------|------|
| `getProviderDisplayName` | `lib/llm/factory.ts` | `lib/llm/utils.ts` | 統合 |
| `simpleTextSplit` | `lib/llm/langchain/rag/index.ts` | `lib/llm/langchain/rag/simple.ts` | 統合 |
| `MAX_FILE_SIZE` | `types/upload.ts` | `lib/upload/file-parser.ts` | `config/constants.ts`へ統合 |
| `AGENT_DEFAULT_PROVIDERS` | `lib/research/config.ts` | `lib/research/constants.ts` | 統合 |

### 4. 未使用エクスポート（将来使用予定がない場合は削除）

#### lib/api/auth.ts
- `optionalAuth` - 未使用
- `requireRole` - 未使用

#### lib/api/utils.ts
- `successResponse` - 未使用
- `parseBody` - 未使用
- `validateProvider` - 未使用

#### lib/api/handler.ts
- `createStreamingResponse` - 未使用

#### lib/llm/factory.ts
- `getProviderInfo` - 未使用（app/admin/page.tsxで同名関数定義）
- `getProviderDisplayName` - 未使用
- `getSameVendorProviders` - 未使用

#### lib/llm/utils.ts
- `resolveProvider` - 未使用
- `isGrokProvider` - 未使用
- `hasSearchCapability` - 未使用

#### lib/llm/errors.ts
- `handleLLMError` - 未使用
- `toLLMError` - 未使用

#### lib/llm/cache.ts
- 全エクスポートが未使用（キャッシュ機能未使用）

#### lib/llm/config.ts
- `RATE_LIMITS` - 未使用
- `UPSTASH_FREE_TIER` - 未使用
- `CACHE_CONFIG` - 未使用

#### lib/llm/langchain/*
- `agents/index.ts` - 全エクスポート未使用
- `memory/index.ts` - 全エクスポート未使用
- `prompts/templates.ts` - 全エクスポート未使用
- `tools/index.ts` - 全エクスポート未使用
- `rag/simple.ts` - 全エクスポート未使用

#### lib/google/drive.ts
- `listFilesInFolder` - 未使用
- `searchFilesByName` - 未使用
- `searchFilesByMimeType` - 未使用
- `getImagePreviewUrl` - 未使用
- `exportFile` - 未使用
- `getGoogleDocAsText` - 未使用
- `getGoogleDocAsMarkdown` - 未使用
- `getGoogleSheetAsCsv` - 未使用
- `getFileDownloadUrl` - 未使用
- `DriveSearchQueries` - 未使用
- `MimeTypes` - 未使用

#### lib/chat/*.ts
- `getGemsByCategory` - 未使用
- `getResearchGems` - 未使用
- `getDocumentGems` - 未使用
- `getGeneralGems` - 未使用
- `getAllChatFeatures` - 未使用
- `getResearchFeatures` - 未使用
- `requiresDynamicPrompt` - 未使用
- `isValidFeatureId` - 未使用

#### lib/settings/*.ts
- `getSystemSetting` - 未使用
- `setSystemSetting` - 未使用
- `deleteSystemSetting` - 未使用
- `isToolEnabled` - 未使用
- `isGrokToolEnabled` - 未使用
- `groupSettingsByCategory` - 未使用
- `validateSetting` - 未使用

#### lib/export/index.ts
- `convertConversationToMarkdown` - 未使用
- `convertConversationToCSV` - 未使用

#### lib/logger/index.ts
- `logError` - 未使用
- `logApiCall` - 未使用
- `logAuth` - 未使用

#### lib/parsers/vtt.ts
- `formatTime` - 未使用
- `cuesToConversation` - 未使用
- `groupBySpeaker` - 未使用

#### lib/xss-sanitizer.ts
- `sanitizeText` - 未使用
- `sanitizeUrl` - 未使用

#### lib/usage/tracker.ts
- `extractTokenUsage` - 未使用

#### lib/admin-styles.ts
- `getProviderBadgeStyle` - 未使用
- `getStatBadgeStyle` - 未使用

---

## 🟢 低優先度：改善検討

### 1. テスト関連

| ファイルパス | 状況 | 推奨 |
|-------------|------|------|
| `tests/e2e/smoke.spec.ts` | すべてのテストが`.skip`で無効化 | 有効化または削除 |
| `tests/integration/` | 空ディレクトリ | 削除 |
| `tests/unit/` | 空ディレクトリ | 削除 |

### 2. 実装不十分なページ

| ファイルパス | 問題 | 推奨 |
|-------------|------|------|
| `app/page.tsx` | ダッシュボード入力欄が装飾のみ（console.logのみ） | 実装または削除 |
| `app/langchain-test/page.tsx` | テスト用ページ | `/admin`配下に移動または削除 |

### 3. 未使用だが将来使用予定ありそう

| ファイルパス | 理由 |
|-------------|------|
| `lib/llm/langchain/` 以下 | LangChain統合の基盤。将来使用予定あり |
| `lib/cache/redis.ts` | Redisキャッシュ基盤。将来使用予定あり |
| `lib/research/prompts.ts` | リサーチエージェント用プロンプト。将来使用予定あり |

### 4. API重複（統合検討）

```
問題: 同じ機能のAPIが複数存在
- PUT /api/admin/prompts?key=xxx と PUT /api/admin/prompts/[key]
- DELETE /api/chat/feature?chatId=xxx と DELETE /api/chat/history?id=xxx

推奱: クエリパラメータ版を削除し、パスパラメータ版を標準化
```

---

## 📊 統計サマリー

| カテゴリ | 件数 |
|---------|------|
| 未使用コンポーネントファイル | 12 |
| 未使用APIエンドポイント | 4 |
| 未使用ユーティリティファイル | 3 |
| 未使用スクリプト | 3 |
| 未使用プロンプトファイル | 7 |
| 未使用型定義 | 8 |
| 未使用Prismaモデル | 1 |
| 未使用エクスポート（関数・定数） | 80+ |
| 重複機能 | 10+ |

---

## 📝 対応優先度まとめ

### 即座に削除可能（影響なし）
1. `components/layout/Header.tsx`
2. `components/layout/SplitPaneLayout.tsx`
3. `components/ui/AttachmentMenu.tsx`
4. `components/meeting-notes/FileUploadChat.tsx`
5. `components/icons/TeddyIcon.tsx`
6. `components/ui/LLMSelector.tsx`
7. `components/ui/ModelSelector.tsx`
8. `components/ui/ExportButton.tsx`
9. `components/ui/FeatureButtons.tsx`
10. `components/ui/slider.tsx`
11. `components/ui/switch.tsx`
12. `app/api/llm/langchain/route.ts`
13. `app/api/llm/langchain/stream/route.ts`
14. `prompts/**/*.md`
15. `types/` の未使用型定義

### 統合後に削除（影響確認必要）
1. `app/(authenticated)/meeting-notes/page.tsx` → `/chat?gem=minutes` 統合
2. `app/(authenticated)/transcripts/page.tsx` → `/chat?gem=na-script` 統合
3. `app/(authenticated)/*/layout.tsx` → 親layout統合

### 検討が必要
1. `lib/llm/langchain/` 以下 - 将来使用予定あり
2. `lib/llm/cache.ts` - キャッシュ機能の有無
3. `lib/google/drive.ts` の未使用関数 - 使用開始または削除

---

## 🔗 関連ドキュメント

- `docs/specs/system-architecture.md` - システム構成
- `docs/specs/api-specification.md` - API仕様
- `docs/specs/database-schema.md` - DBスキーマ

---

*最終更新: 2026-02-22*
