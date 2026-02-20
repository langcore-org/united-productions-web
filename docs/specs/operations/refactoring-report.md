# コードベースリファクタリング調査レポート

> **最終更新**: 2026-02-20 19:00

---

## 概要

本ドキュメントは、AI Hub（Teddy）プロジェクトのコードベース全体を調査し、リファクタリングすべき箇所を包括的にまとめたものです。

---

## 1. アーキテクチャ・設計パターン

### 1.1 重複した設定・定義の統合

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **LLMプロバイダー定義の重複** | `lib/llm/types.ts` で型定義、`lib/llm/factory.ts` で配列定義、`prisma/schema.prisma` でenum定義と、同じプロバイダー情報が3箇所に分散している | `lib/llm/types.ts:12-22`, `lib/llm/factory.ts:90-101`, `prisma/schema.prisma:17-28` | 高 |
| **レート制限設定の重複** | `lib/llm/config.ts` の `FREE_TIER_LIMITS` と `lib/rate-limit.ts` の `DEFAULT_RATE_LIMITS` が同一内容 | `lib/llm/config.ts:161-177`, `lib/rate-limit.ts:29-45` | 高 |
| **チャット機能定義の重複** | `lib/chat/gems.ts` の `GemId` と `lib/chat/chat-config.ts` の `ChatFeatureId` がほぼ同一（`general` vs `general-chat` のみ異なる） | `lib/chat/gems.ts:17-25`, `lib/chat/chat-config.ts:18-26` | 高 |
| **Grokツール設定の複雑性** | `lib/settings/db.ts` の `GrokToolSettings` に32個もの個別設定項目があり、実際には全機能で全ツールが有効（`isToolEnabled` が常に `true` を返す） | `lib/settings/db.ts:122-160`, `lib/settings/db.ts:271-279` | 中 |

### 1.2 設定ファイルの一元化

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **キャッシュ設定の分散** | `lib/cache/redis.ts` の `CACHE_TTL` と `lib/llm/config.ts` の `CACHE_CONFIG` が別々に定義されている | `lib/cache/redis.ts:79-90`, `lib/llm/config.ts:197-204` | 中 |
| **デフォルトプロバイダーの定義場所** | `lib/llm/config.ts` と `lib/settings/db.ts` で別々にデフォルト値が管理されている | `lib/llm/config.ts:129`, `lib/settings/db.ts:101-107` | 中 |

---

## 2. 型安全性・TypeScript

### 2.1 any型の使用

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **Prisma型アサーション** | `lib/settings/db.ts` でGrokToolSettings取得時に複雑な型アサーションを使用 | `lib/settings/db.ts:284-299`, `lib/settings/db.ts:307-333` | 中 |
| **usage trackerのmetadata** | `Record<string, any>` を使用している | `lib/usage/tracker.ts:14` | 低 |
| **APIレスポンスの型付け** | `app/api/llm/stream/route.ts` で `body as { provider?: string }` 等のキャスト | `app/api/llm/stream/route.ts:186-188` | 中 |

### 2.2 型定義の不一致

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **ChatMessage型の重複** | `components/chat/types.ts` と `components/ui/FeatureChat.tsx` で別々に定義 | `components/chat/types.ts:1-9`, `components/ui/FeatureChat.tsx:15-21` | 中 |
| **Session型のキャスト** | `app/layout.tsx` で `as import("next-auth").Session | null` と複雑なキャスト | `app/layout.tsx:29` | 低 |

---

## 3. コンポーネント構造

### 3.1 重複コンポーネント

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **StreamingMessageの重複** | `components/ui/StreamingMessage.tsx` と `components/chat/StreamingMessage.tsx` と `components/research/message/StreamingMessage.tsx` が存在 | `components/ui/StreamingMessage.tsx`, `components/chat/StreamingMessage.tsx`, `components/research/message/StreamingMessage.tsx` | 高 |
| **ChatMessageの重複** | `components/chat/ChatMessage.tsx` と `components/research/message/ChatMessage.tsx` がほぼ同一 | `components/chat/ChatMessage.tsx`, `components/research/message/ChatMessage.tsx` | 高 |
| **ChatInputの重複** | `components/chat/ChatInput.tsx` と `components/research/ChatInput.tsx` が存在 | `components/chat/ChatInput.tsx`, `components/research/ChatInput.tsx` | 中 |
| **EmptyStateの重複** | `components/chat/EmptyState.tsx` と `components/research/EmptyState.tsx` が存在 | `components/chat/EmptyState.tsx`, `components/research/EmptyState.tsx` | 中 |

### 3.2 コンポーネントの責務

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **FeatureChatの肥大化** | 498行と大きく、複数の責務（メッセージ管理、ファイル添付、履歴保存、UIレンダリング）を持つ | `components/ui/FeatureChat.tsx` | 中 |
| **Sidebarの定数定義** | `NEW_CHAT_BUTTONS` がコンポーネントファイル内に定義されており、設定とUIが混在 | `components/layout/Sidebar.tsx:32-81` | 低 |
| **useChatフックの重複** | `hooks/useChat.ts` と `hooks/use-llm.ts` と `components/ui/StreamingMessage.tsx` の `useLLMStream` が類似機能を提供 | `hooks/useChat.ts`, `hooks/use-llm.ts`, `components/ui/StreamingMessage.tsx:37-182` | 高 |

---

## 4. API Routes

### 4.1 重複ロジック

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **SSEストリーミング処理の重複** | `lib/api/handler.ts` の `createStreamingResponse` と `app/api/llm/stream/route.ts` の `createStreamResponse` が類似 | `lib/api/handler.ts:112-144`, `app/api/llm/stream/route.ts:48-145` | 高 |
| **認証チェックの重複** | 各API Routeで `requireAuth` を呼び出しているが、一部で個別にエラーハンドリング | 複数のAPI Routes | 中 |
| **プロバイダー検証の重複** | `isValidProvider` チェックが複数のAPIで個別に実装 | `app/api/llm/chat/route.ts:77-84`, `app/api/llm/stream/route.ts:226-240` | 中 |

### 4.2 エラーハンドリング

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **エラーログの不統一** | `console.error` と `logger.error` が混在している | 複数ファイル | 中 |
| **エラーレスポンス形式の不統一** | 一部のAPIで独自のエラーレスポンス形式を使用 | `app/api/llm/stream/route.ts:191-200` 等 | 低 |

---

## 5. データベース・Prisma

### 5.1 スキーマ設計

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **GrokToolSettingsモデルとの不一致** | `lib/settings/db.ts` の型と `prisma/schema.prisma` の `GrokToolSettings` モデルが手動で同期する必要がある | `prisma/schema.prisma:213-227`, `lib/settings/db.ts:122-160` | 中 |
| **未使用のインデックスコメント** | `User` モデルの `@@index([email])` と `@@index([googleId])` がコメントアウトされたまま | `prisma/schema.prisma:102-104` | 低 |

### 5.2 クエリ最適化

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **N+1クエリの可能性** | `lib/prompts/db.ts` の `getAllPrompts` で全プロンプト取得時に関連データを取得していない | `lib/prompts/db.ts:410-418` | 低 |
| **キャッシュの二重管理** | `lib/settings/db.ts` と `lib/cache/redis.ts` で別々のキャッシュ機構を使用 | `lib/settings/db.ts:27-63`, `lib/cache/redis.ts` | 中 |

---

## 6. LLM統合

### 6.1 クライアント実装

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **未実装クライアントのプレースホルダー** | `OpenAIClient` と `AnthropicClient` が `NotImplementedClient` で代替 | `lib/llm/factory.ts:63-69` | 中 |
| **GrokClientの特殊処理** | `app/api/llm/stream/route.ts` で `instanceof GrokClient` チェックして分岐 | `app/api/llm/stream/route.ts:282-295` | 中 |
| **ストリーミング処理の重複** | `GeminiClient` と `GrokClient` でSSEパース処理が重複 | `lib/llm/clients/gemini.ts:193-247`, `lib/llm/clients/grok.ts:268-427` | 中 |

### 6.2 プロンプト管理

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **プロンプトの重複定義** | `lib/prompts/db.ts` の `DEFAULT_PROMPTS` と個別ファイル (`lib/prompts/minutes.ts` 等) で二重定義 | `lib/prompts/db.ts:12-255`, `lib/prompts/*.ts` | 高 |
| **getProposalSystemPromptの引数** | 空文字列をデフォルト値として渡している箇所がある | `lib/chat/gems.ts:115`, `lib/chat/chat-config.ts:100` | 低 |

---

## 7. ロギング・監視

### 7.1 ロガーの重複

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **ロガー実装の重複** | `lib/logger.ts` と `lib/logger/index.ts` が別々のロガーを提供 | `lib/logger.ts`, `lib/logger/index.ts` | 高 |
| **ログレベルの不一致** | `lib/logger.ts` は `'debug' \| 'info' \| 'warn' \| 'error'`、`lib/logger/index.ts` は Prisma の `LogLevel` enum を使用 | `lib/logger.ts:7`, `lib/logger/index.ts:31-38` | 中 |

---

## 8. 未使用・不要コード

### 8.1 コメントアウトされたコード

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **TeddyIconのコメントアウト** | Sidebarでロゴ表示がコメントアウトされたまま | `components/layout/Sidebar.tsx:21`, `151-163` | 低 |
| **schedules関連の削除痕** | middleware、複数ファイルで `/schedules` パスがコメントアウト | `middleware.ts:14`, `middleware.ts:75` 等 | 低 |
| **PJ-D（ロケスケ）の削除痕** | `PROJECT_DEFAULT_PROVIDERS` 等でPJ-D関連がコメントアウト | `lib/llm/config.ts:139` | 低 |

### 8.2 未使用のインポート・変数

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **eslint-disableの過剰使用** | `lib/settings/db.ts` で未使用パラメータの警告を抑制 | `lib/settings/db.ts:272-275` | 低 |
| **Wave 2 TODOコメント** | `lib/llm/factory.ts` に実装予定のTODOコメント | `lib/llm/factory.ts:63`, `68` | 低 |

---

## 9. テスト・品質

### 9.1 テストカバレッジ

| 項目 | 問題の詳細 | 該当ファイル | 優先度 |
|------|-----------|-------------|--------|
| **テストファイルの不足** | `tests/` ディレクトリに実際のテストが少ない | `tests/` | 高 |
| **E2Eテストの設定** | Playwright設定はあるが、実際のテストスイートが不足 | `playwright.config.ts` | 中 |

---

## 10. 推奨リファクタリング優先順位

### 高優先度（即座に対応推奨）

1. ✅ **LLMプロバイダー定義の統一** - `VALID_PROVIDERS` を `types.ts` に集約（2026-02-20完了）
2. ✅ **StreamingMessageコンポーネントの統合** - 3つを1つに統合（2026-02-20完了）
3. ✅ **ChatMessageコンポーネントの統合** - 2つを1つに統合（2026-02-20完了）
4. ✅ **useChat/useLLMフックの統合** - useLLMにuseLLMStreamを統合（2026-02-20完了）
5. ✅ **プロンプト定義の統一** - DB管理に一本化（2026-02-20完了）

### 中優先度（計画的な対応）

6. ✅ **レート制限設定の統合** - `lib/llm/config.ts` の `FREE_TIER_LIMITS` を Single Source of Truth に（2026-02-20完了）
7. ✅ **ロガー実装の統合** - クライアント/サーバー用を明確に分離（2026-02-20完了）
8. **SSEストリーミング処理の共通化** - 一部統合済み、完全統合は将来対応
9. **チャット機能定義（Gem/ChatFeature）の統一** - 用途が異なるため現状維持

### 低優先度（余裕がある場合）

9. **コメントアウトコードの削除**
10. **型アサーションの削減**
11. **FeatureChatコンポーネントの分割**
12. **テストの追加**

---

## 関連ドキュメント

- [システムアーキテクチャ](./system-architecture.md)
- [API仕様](./api-specification.md)
- [データベーススキーマ](./database-schema.md)
- [エラーハンドリング](./error-handling.md)

---

## 更新履歴

| 日時 | 更新内容 |
|------|---------|
| 2026-02-20 19:00 | 初版作成 |
| 2026-02-20 20:30 | リファクタリング完了 - 全高優先度タスクと中優先度タスクの大部分を完了 |
