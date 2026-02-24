# Knip未使用コード検出レポート

> **2026-02-24実行結果・2026-02-24更新**

---

## 概要

Knipによる未使用コード検出結果。削除前に各ファイルの用途を確認すること。

---

## 対応状況

| カテゴリ | ファイル数 | 対応 |
|----------|-----------|------|
| A. 削除済み | 10個 | ✅ 完了（2026-02-23） |
| B. 慎重検討 | 5個 | ⏸️ 保留（将来的に使用予定あり） |
| C. 保留 | 10個 | ⏸️ 保留（機能拡張時に使用） |
| D. 新規検出 | 32個 | 🆕 要確認（2026-02-24） |

---

## A. 削除済み（10個）✅

### 第1波（4個）- 2026-02-23

| ファイル | 削除理由 |
|----------|----------|
| `lib/logger/index.ts` | `lib/logger.ts`と重複 |
| `scripts/test-langchain.ts` | テスト用スクリプト（未使用） |
| `scripts/check-prompts.ts` | 未使用スクリプト |
| `scripts/update-agentic-prompts.ts` | 未使用スクリプト |

### 第2波（6個）- 2026-02-23

| ファイル | 削除理由 |
|----------|----------|
| `components/chat/ProcessingFlow.tsx` | 未使用、`StreamingSteps.tsx`で代替 |
| `components/chat/ReasoningSteps.tsx` | 未使用、`StreamingSteps.tsx`で代替 |
| `components/chat/ToolCallIndicator.tsx` | 未使用、`StreamingSteps.tsx`で代替 |
| `components/chat/ChatMessage.tsx` | 未使用、どこからもインポートされていない |
| `components/chat/EmptyState.tsx` | 再エクスポートのみ、`components/ui/EmptyState.tsx`を直接使用 |
| `components/ui/StreamingMessage.tsx` | 未使用、`FeatureChat.tsx` + `StreamingSteps.tsx`で代替 |

**削除時の修正**:
- `hooks/useThinkingSteps.ts`: インポートパスを `@/components/ui/StreamingMessage` → `@/hooks/useLLMStream/types` に変更

**削除日**: 2026-02-23

---

## B. 慎重検討（5個）⏸️ 保留

### 方針
将来的に使用する可能性があるため、**現時点では削除しない**。機能実装時に再評価。

### コンポーネント（3個）

| ファイル | 備考 | 将来の使用予定 |
|----------|------|---------------|
| `components/chat/AgenticResponse.tsx` | エージェント応答表示 | ⭐ 高：エージェント機能強化時 |
| `components/ui/dropdown-menu.tsx` | shadcnコンポーネント | 低：shadcn標準コンポーネント |
| `components/ui/slider.tsx` | shadcnコンポーネント | 低：shadcn標準コンポーネント |
| `components/ui/switch.tsx` | shadcnコンポーネント | 低：shadcn標準コンポーネント |

### フック（2個）

| ファイル | 備考 | 将来の使用予定 |
|----------|------|---------------|
| `hooks/use-llm.ts` | useLLMフック（useLLMStreamに移行済） | 低：旧フックのフォールバック |
| `hooks/useThinkingSteps.ts` | 思考ステップフック | 中：思考プロセス機能時 |

### 削除判断基準

- **高優先度（⭐）**: 今後3ヶ月以内に使用予定あり → **削除禁止**
- **中優先度**: 半年以内に使用予定あり → **慎重に検討**
- **低優先度**: 使用予定未定 → **削除可能（要確認）**

---

## C. 保留（10個）⏸️ 機能拡張時に使用

### 方針
機能拡張時に必要となるため、**現時点では削除しない**。技術的負債として管理。

### lib（8個）

| ファイル | 用途 | 関連機能 |
|----------|------|----------|
| `lib/llm/langchain/agents/index.ts` | LangChainエージェント | 自律的エージェント機能 |
| `lib/llm/langchain/memory/index.ts` | LangChainメモリ | 会話履歴管理強化 |
| `lib/llm/langchain/prompts/templates.ts` | プロンプトテンプレート | プロンプト管理機能 |
| `lib/llm/langchain/tools/index.ts` | LangChainツール | ツール連携機能 |
| `lib/google/drive.ts` | Google Drive連携 | ファイルアップロード機能 |
| `lib/parsers/document.ts` | ドキュメントパーサー | ドキュメント解析機能 |
| `lib/parsers/vtt.ts` | VTTパーサー | 字幕ファイル解析 |
| `lib/cache/redis.ts` | Redisキャッシュ | キャッシュ機能強化 |

### 依存関係（2個）

| パッケージ | 用途 | 関連機能 |
|------------|------|----------|
| `@google/generative-ai` | Google Gemini API | Geminiモデル連携 |
| `@langchain/textsplitters` | LangChainテキスト分割 | RAG機能 |
| `@upstash/redis` | Redisキャッシュ | キャッシュ機能 |
| `bcryptjs` | パスワードハッシュ | 認証機能強化 |
| `dompurify` | XSSサニタイズ | セキュリティ強化 |
| `encoding-japanese` | 日本語エンコーディング | 文字コード処理 |
| `file-saver` | ファイル保存 | エクスポート機能 |
| `jschardet` | 文字コード検出 | ファイル解析 |
| `langchain` | LangChainコア | エージェント機能 |
| `uuid` | UUID生成 | ID生成 |

### 管理方針

- **優先度**: 機能拡張ロードマップに従って順次有効化
- **見直しタイミング**: 四半期ごとに未使用パッケージを再評価
- **削除条件**: 1年以上未使用かつ使用予定がない場合

---

## D. 新規検出（32個）🆕 要確認

### 方針
2026-02-24時点での新規検出ファイル。各ファイルの使用状況を確認し、削除・統合・または使用開始を検討。

### コンポーネント（14個）

| ファイル | カテゴリ | 対応案 |
|----------|----------|--------|
| `components/icons/TeddyIcon.tsx` | アイコン | 確認：どこで使用予定か |
| `components/layout/Header.tsx` | レイアウト | 確認：`AppLayout`との違い |
| `components/layout/SplitPaneLayout.tsx` | レイアウト | 確認：リサイズパネル機能 |
| `components/meeting-notes/FileUploadChat.tsx` | 機能 | 確認：議事録機能で使用？ |
| `components/ui/AttachmentMenu.tsx` | UI | 確認：添付ファイル機能 |
| `components/ui/EmptyState.tsx` | UI | 統合：`components/chat/EmptyState.tsx`削除済み、これが代替？ |
| `components/ui/ExportButton.tsx` | UI | 確認：エクスポート機能 |
| `components/ui/FeatureButtons.tsx` | UI | 確認：機能ボタン群 |
| `components/ui/LLMSelector.tsx` | UI | 統合：`ModelSelector.tsx`と重複？ |
| `components/ui/ModelSelector.tsx` | UI | 統合：`LLMSelector.tsx`と重複？ |

### lib（15個）

| ファイル | カテゴリ | 対応案 |
|----------|----------|--------|
| `lib/api/index.ts` | API | 確認：エクスポート集約ファイル |
| `lib/env-check.ts` | 設定 | 確認：環境変数チェック |
| `lib/export/index.ts` | エクスポート | 確認：エクスポート機能のエントリ |
| `lib/llm/cache.ts` | LLM | 統合：`lib/cache/redis.ts`と重複？ |
| `lib/llm/utils.ts` | LLM | 確認：LLMユーティリティ |
| `lib/markdown.ts` | ユーティリティ | 確認：Markdown処理 |
| `lib/rate-limit.ts` | ミドルウェア | 確認：レート制限機能 |
| `lib/research/config.ts` | リサーチ | 確認：調査設定 |
| `lib/research/constants.ts` | リサーチ | 確認：調査定数 |
| `lib/research/prompts.ts` | リサーチ | 確認：調査プロンプト |
| `lib/settings/types.ts` | 設定 | 確認：設定型定義 |

### その他（3個）

| ファイル | カテゴリ | 対応案 |
|----------|----------|--------|
| `tests/e2e/auth.setup.ts` | テスト | 確認：E2E認証セットアップ |
| `types/research.ts` | 型 | 確認：調査関連型定義 |

---

## 依存関係の見直し

### 未使用依存関係（2個）

| パッケージ | 状態 | 対応案 |
|------------|------|--------|
| `@upstash/redis` | 未使用 | Cグループで保留中、キャッシュ機能実装時に使用 |
| `langchain` | 未使用 | Cグループで保留中、エージェント機能実装時に使用 |

### 未使用devDependencies（6個）

| パッケージ | 状態 | 対応案 |
|------------|------|--------|
| `@types/bcryptjs` | 未使用 | Cグループ関連、認証機能強化時に使用 |
| `@types/file-saver` | 未使用 | Cグループ関連、エクスポート機能時に使用 |
| `@types/uuid` | 未使用 | Cグループ関連 |
| `shadcn` | 未使用 | 確認：shadcn CLIは不要？ |
| `tailwindcss` | 未使用 | 確認：PostCSS経由で使用？ |
| `tw-animate-css` | 未使用 | 確認：Tailwindアニメーション |

---

## 今後のアクション

### 即座（今週内）

- [ ] **Dグループの重複ファイル確認・統合**
  - `LLMSelector.tsx` ↔ `ModelSelector.tsx` の統合検討
  - `lib/llm/cache.ts` ↔ `lib/cache/redis.ts` の統合検討
- [ ] **shadcn関連パッケージの確認**
  - `shadcn`, `tailwindcss`, `tw-animate-css` が本当に未使用か確認

### 短期（1-3ヶ月）

- [ ] Bグループの高優先度ファイル（⭐）の使用開始検討
- [ ] `AgenticResponse` の統合検討（`StreamingSteps`との重複解消）
- [ ] Dグループの未使用ファイルの段階的削除（10-15個程度）

### 中期（3-6ヶ月）

- [ ] CグループのLangChain関連ファイルの有効化検討
- [ ] エージェント機能の実装時に `agents/index.ts`, `tools/index.ts` を使用

### 長期（6-12ヶ月）

- [ ] 未使用パッケージの再評価
- [ ] 1年以上未使用のパッケージ削除検討

---

## 注意事項

1. **削除前の確認**: ファイル削除前に必ず以下を確認
   - 他のファイルからの参照がないか
   - 将来的な使用予定がないか
   - バックアップが取得できているか

2. **段階的削除**: 一度に大量のファイルを削除せず、1ファイルずつ確認しながら削除

3. **テスト**: 削除後は必ずビルドとテストを実行

---

**最終更新**: 2026-02-24

**次回見直し予定**: 2026-03-24（1ヶ月後）
