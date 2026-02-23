# Knip未使用コード検出レポート

> **2026-02-23実行結果**

---

## 概要

Knipによる未使用コード検出結果。削除前に各ファイルの用途を確認すること。

---

## 未使用ファイル（47個）

### コンポーネント（20個）

| ファイル | 備考 |
|----------|------|
| `components/chat/AgenticResponse.tsx` | エージェント応答表示（今後使用予定あり） |
| `components/chat/ChatMessage.tsx` | チャットメッセージ（旧実装） |
| `components/chat/EmptyState.tsx` | 空状態表示 |
| `components/chat/ProcessingFlow.tsx` | 処理フロー表示 |
| `components/chat/ReasoningSteps.tsx` | 思考ステップ表示 |
| `components/chat/ToolCallIndicator.tsx` | ツール呼び出しインジケーター |
| `components/icons/TeddyIcon.tsx` | Teddyアイコン |
| `components/layout/Header.tsx` | ヘッダー（旧実装） |
| `components/layout/SplitPaneLayout.tsx` | 分割ペインレイアウト |
| `components/meeting-notes/FileUploadChat.tsx` | ファイルアップロードチャット |
| `components/ui/AttachmentMenu.tsx` | 添付メニュー |
| `components/ui/dropdown-menu.tsx` | ドロップダウンメニュー（shadcn） |
| `components/ui/EmptyState.tsx` | 空状態表示 |
| `components/ui/ExportButton.tsx` | エクスポートボタン |
| `components/ui/FeatureButtons.tsx` | 機能ボタン |
| `components/ui/LLMSelector.tsx` | LLM選択（旧実装） |
| `components/ui/ModelSelector.tsx` | モデル選択（旧実装） |
| `components/ui/slider.tsx` | スライダー（shadcn） |
| `components/ui/StreamingMessage.tsx` | ストリーミングメッセージ（旧実装） |
| `components/ui/switch.tsx` | スイッチ（shadcn） |

### フック（2個）

| ファイル | 備考 |
|----------|------|
| `hooks/use-llm.ts` | useLLMフック（useLLMStreamに移行済） |
| `hooks/useThinkingSteps.ts` | 思考ステップフック |

### lib（15個）

| ファイル | 備考 |
|----------|------|
| `lib/api/index.ts` | APIインデックス |
| `lib/cache/redis.ts` | Redisキャッシュ |
| `lib/env-check.ts` | 環境変数チェック |
| `lib/export/index.ts` | エクスポート機能 |
| `lib/google/drive.ts` | Google Drive連携 |
| `lib/llm/cache.ts` | LLMキャッシュ |
| `lib/llm/langchain/agents/index.ts` | LangChainエージェント |
| `lib/llm/langchain/memory/index.ts` | LangChainメモリ |
| `lib/llm/langchain/prompts/templates.ts` | プロンプトテンプレート |
| `lib/llm/langchain/tools/index.ts` | LangChainツール |
| `lib/llm/utils.ts` | LLMユーティリティ |
| `lib/logger/index.ts` | ロガー（lib/logger.tsがある） |
| `lib/markdown.ts` | Markdown処理 |
| `lib/parsers/document.ts` | ドキュメントパーサー |
| `lib/parsers/vtt.ts` | VTTパーサー |

### その他（10個）

| ファイル | 備考 |
|----------|------|
| `lib/rate-limit.ts` | レート制限 |
| `lib/research/config.ts` | リサーチ設定 |
| `lib/research/constants.ts` | リサーチ定数 |
| `lib/research/prompts.ts` | リサーチプロンプト |
| `lib/settings/types.ts` | 設定型定義 |
| `scripts/check-prompts.ts` | プロンプトチェックスクリプト |
| `scripts/test-langchain.ts` | LangChainテストスクリプト |
| `scripts/update-agentic-prompts.ts` | エージェントプロンプト更新 |
| `tests/e2e/auth.setup.ts` | E2E認証セットアップ |
| `types/research.ts` | リサーチ型定義 |

---

## 未使用依存関係（10個）

| パッケージ | 備考 |
|------------|------|
| `@google/generative-ai` | Google Gemini API（将来使用予定） |
| `@langchain/textsplitters` | LangChainテキスト分割 |
| `@upstash/redis` | Redisキャッシュ |
| `bcryptjs` | パスワードハッシュ |
| `dompurify` | XSSサニタイズ |
| `encoding-japanese` | 日本語エンコーディング |
| `file-saver` | ファイル保存 |
| `jschardet` | 文字コード検出 |
| `langchain` | LangChain（コアパッケージは使用） |
| `uuid` | UUID生成 |

---

## 未使用devDependencies（6個）

| パッケージ | 備考 |
|------------|------|
| `@types/bcryptjs` | bcryptjs型定義 |
| `@types/file-saver` | file-saver型定義 |
| `@types/uuid` | uuid型定義 |
| `shadcn` | shadcn/ui CLI |
| `tailwindcss` | Tailwind CSS（PostCSS経由で使用） |
| `tw-animate-css` | Tailwindアニメーション |

---

## 未リスト化依存関係（4個）

| パッケージ | 使用場所 |
|------------|----------|
| `@next/bundle-analyzer` | next.config.ts |
| `postcss` | postcss.config.mjs |
| `jsdom` | vitest.config.ts |
| `@vitest/coverage-v8` | vitest.config.ts |

---

## 対応方針

### 即座に削除可能

- 重複ファイル（`lib/logger/index.ts` → `lib/logger.ts`がある）
- 明確に不要なスクリプト（`scripts/test-langchain.ts`など）

### 慎重に検討が必要

- shadcn/uiコンポーネント（将来的に使用する可能性）
- LangChain関連（機能拡張時に使用）
- Google Gemini関連（将来的に使用予定）

### 保留

- テストファイル（E2E認証セットアップ）
- 型定義ファイル

---

**最終更新**: 2026-02-23
