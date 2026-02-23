# Knip未使用コード検出レポート

> **2026-02-23実行結果**

---

## 概要

Knipによる未使用コード検出結果。削除前に各ファイルの用途を確認すること。

---

## 対応状況

| カテゴリ | ファイル数 | 対応 |
|----------|-----------|------|
| A. 削除済み | 4個 | ✅ 完了（2026-02-23） |
| B. 慎重検討 | 11個 | ⏸️ 保留（将来的に使用予定あり） |
| C. 保留 | 10個 | ⏸️ 保留（機能拡張時に使用） |

---

## A. 削除済み（4個）✅

| ファイル | 削除理由 |
|----------|----------|
| `lib/logger/index.ts` | `lib/logger.ts`と重複 |
| `scripts/test-langchain.ts` | テスト用スクリプト（未使用） |
| `scripts/check-prompts.ts` | 未使用スクリプト |
| `scripts/update-agentic-prompts.ts` | 未使用スクリプト |

**削除日**: 2026-02-23

---

## B. 慎重検討（11個）⏸️ 保留

### 方針
将来的に使用する可能性があるため、**現時点では削除しない**。機能実装時に再評価。

### コンポーネント（9個）

| ファイル | 備考 | 将来の使用予定 |
|----------|------|---------------|
| `components/chat/AgenticResponse.tsx` | エージェント応答表示 | ⭐ 高：エージェント機能強化時 |
| `components/chat/ChatMessage.tsx` | チャットメッセージ（旧実装） | 中：旧フック使用時のフォールバック |
| `components/chat/EmptyState.tsx` | 空状態表示 | 中：UI統一時 |
| `components/chat/ProcessingFlow.tsx` | 処理フロー表示 | 中：ステップ表示機能時 |
| `components/chat/ReasoningSteps.tsx` | 思考ステップ表示 | ⭐ 高：思考プロセス可視化時 |
| `components/chat/ToolCallIndicator.tsx` | ツール呼び出しインジケーター | ⭐ 高：ツール機能強化時 |
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

## 今後のアクション

### 短期（1-3ヶ月）

- [ ] Bグループの高優先度ファイル（⭐）の使用開始検討
- [ ] `AgenticResponse`, `ReasoningSteps`, `ToolCallIndicator` の統合

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

**最終更新**: 2026-02-23

**次回見直し予定**: 2026-05-23（3ヶ月後）
