# リファクタリング候補一覧

> 対象範囲: `agent1` アプリ全体（admin管理画面を除く）
> 作成日: 2026-02-21
> **更新日: 2026-02-22 10:45** - 全項目完了

---

## 優先度・難易度凡例

| 記号 | 優先度 | 意味 |
|------|--------|------|
| 🔴 | 高 | コード品質・保守性に直接影響。早急に対応すべき |
| 🟠 | 中 | 放置すると技術的負債が蓄積する |
| 🟡 | 低 | 改善効果はあるが緊急性は低い |

| 記号 | 難易度 | 意味 |
|------|--------|------|
| ⬛ | 高 | 設計変更を伴い、広範囲に影響する |
| 🟫 | 中 | 複数ファイルにまたがるが、設計変更は最小限 |
| 🟨 | 低 | 単一ファイル内で完結する |

---

## 1. ~~SSEストリーム処理の重複~~ ✅ 完了

**優先度: 🔴 高 / 難易度: 🟫 中**

### 対応内容

- `lib/llm/sse-parser.ts` を新規作成し、SSEストリームパース処理を一元化
- `hooks/useChat.ts`、`components/ui/StreamingMessage.tsx` で `parseSSEStream` を使用するよう修正済み

### 関連ファイル

- `lib/llm/sse-parser.ts` - 新規作成されたユーティリティ
- `hooks/useChat.ts` - `parseSSEStream` を使用
- `components/ui/StreamingMessage.tsx` - `parseSSEStream` を使用

---

## 2. ~~ツール設定の重複定義~~ ✅ 完了

**優先度: 🔴 高 / 難易度: 🟨 低**

### 対応内容

- `lib/tools/config.ts` を新規作成し、ツール設定を一元管理
- `TOOL_CONFIG` オブジェクトで `icon`, `label`, `description` を統合定義
- `components/ui/StreamingMessage.tsx` と `components/chat/AgenticResponse.tsx` で共有設定を使用

### 関連ファイル

- `lib/tools/config.ts` - 新規作成された設定ファイル
- `components/ui/StreamingMessage.tsx` - `getToolConfig()`, `TOOL_CONFIG` を使用
- `components/chat/AgenticResponse.tsx` - 同様に統合設定を使用

---

## 3. ~~`FeatureChat.tsx` の肥大化~~ ✅ 完了

**優先度: 🔴 高 / 難易度: ⬛ 高**

### 対応内容

- コンポーネントを分割し、責務を分離
- カスタムフックへの処理抽出

---

## 4. ~~`useChat.ts` の `handleStream` 関数の肥大化~~ ✅ 完了

**優先度: 🔴 高 / 難易度: ⬛ 高**

### 対応内容

**2026-02-22完了**: `hooks/useChat.ts` を完全削除し、`hooks/useLangChainChat.ts` に統合。

- `hooks/useChat.ts` - 削除済み
- `hooks/useLangChainChat.ts` - シンプル化された実装に更新
- `lib/api/llm-client.ts` - 新規作成。APIクライアント層を分離

### 改善結果

- `handleStream` の肥大化問題はフック削除により解消
- APIクライアント層の導入により、HTTPリクエストとUIロジックを分離
- `useLangChainChat.ts` はシンプルな状態管理（`isLoading` のみ）を維持

### 関連ファイル

- ~~`hooks/useChat.ts`~~ - 削除済み
- `hooks/useLangChainChat.ts` - 統合版フック
- `lib/api/llm-client.ts` - 新規APIクライアント層

---

## 5. ~~`as unknown` キャストの多用~~ ✅ 完了

**優先度: 🔴 高 / 難易度: 🟫 中**

### 対応内容

**2026-02-22完了**: `lib/settings/db.ts` の `as unknown` キャストを除去。

- `GrokToolSettings` モデルのスキーマを `settings Json` 型に再設計（`#8` と連動）
- `getGrokToolSettings` / `saveGrokToolSettings` で `prisma as unknown as {...}` を `prisma.grokToolSettings` の直接呼び出しに変更
- `saveGrokToolSettings` 内の `data as unknown as Prisma.InputJsonValue` を `data as Prisma.InputJsonValue` に変更（二段キャストを廃止）

### 関連ファイル

- [lib/settings/db.ts](lib/settings/db.ts) - キャスト除去
- [prisma/schema.prisma](prisma/schema.prisma) - `GrokToolSettings` モデルを JSON 型に再設計

---

## 6. ~~エラーの握りつぶし~~ ✅ 完了

**優先度: 🟠 中 / 難易度: 🟨 低**

### 対応内容

**2026-02-22完了**: `lib/settings/db.ts` のエラーハンドリングを統一。

| 関数 | 修正前 | 修正後 |
|------|--------|--------|
| `getSystemSetting` | `catch { return null; }` | `logger.error(...)` → `throw err` |
| `getGrokToolSettings` | `console.error(...)` のみ | `logger.error(...)` + fallback（意図的） |
| `getSystemGrokToolSettings` | `console.error(...)` → `throw` | `logger.error(...)` → `throw err` |

- `console.error` を構造化ロガー（`logger.error`）に統一
- エラーは呼び出し元にスロー（フォールバックが適切な箇所を除く）

### 関連ファイル

- [lib/settings/db.ts](lib/settings/db.ts) - エラーハンドリング統一

---

## 7. ~~状態の二重・三重管理~~ ✅ 完了

**優先度: 🟠 中 / 難易度: 🟫 中**

### 対応内容

**2026-02-22完了**: `hooks/useChat.ts` を削除し、`hooks/useLangChainChat.ts` のシンプルな状態管理に統合。

- ~~`isLoading` / `isStreaming` / `streamState.isComplete` の三重管理~~ → `isLoading` のみに統合
- `useLangChainChat.ts` ではシンプルな状態管理を維持

### 改善結果

- 状態管理がシンプルになり、整合性の問題が解消
- コードの可読性と保守性が向上

### 関連ファイル

- ~~`hooks/useChat.ts`~~ - 削除済み
- `hooks/useLangChainChat.ts` - シンプルな状態管理を採用

---

## 8. ~~`GrokToolSettings` インターフェースの設計問題~~ ✅ 完了

**優先度: 🟠 中 / 難易度: ⬛ 高**

### 対応内容

**2026-02-22完了**: 32フィールドの平坦な構造を `Record<ChatFeatureId, GrokToolType[]>` のネスト構造に再設計。

| 変更点 | 修正前 | 修正後 |
|--------|--------|--------|
| 型定義 | `interface GrokToolSettings` (32 boolean fields) | `type GrokToolSettings = Record<ChatFeatureId, GrokToolType[]>` |
| DBスキーマ | 8個の個別booleanカラム | `settings Json` 1カラム |
| 変換関数 | `featureIdToToolKey()`, `getToolSettingKey()` 存在 | 削除（不要） |
| 命名ルール | camelCase (`generalChat`, `xSearchResearchCast`) | kebab-case (`ChatFeatureId`) をそのまま使用 |
| 管理画面 | camelCase キーを動的構築 | `GrokToolType[]` 配列の includes/filter で操作 |

### 改善結果

- 機能・ツール追加時の修正箇所が `chat-config.ts` のみに集約
- `featureIdToToolKey` / `getToolSettingKey` の変換関数を削除（ケバブ/キャメル変換が不要）
- `as unknown` キャストも除去（Prisma JSON 型で適切に扱える）
- DBマイグレーション `20260222000000_refactor_grok_tool_settings_to_json` 適用済み

### 関連ファイル

- [lib/settings/db.ts](lib/settings/db.ts) - 型定義・DB操作・ヘルパー関数を再設計
- [prisma/schema.prisma](prisma/schema.prisma) - `GrokToolSettings` モデルを JSON 型に変更
- [app/api/settings/grok-tools/route.ts](app/api/settings/grok-tools/route.ts) - Zod スキーマを新構造に対応
- [app/admin/grok-tools/page.tsx](app/admin/grok-tools/page.tsx) - 管理UIを新構造に対応

---

## 9. ~~`fetch` の直接呼び出し~~ ✅ 完了

**優先度: 🟠 中 / 難易度: ⬛ 高**

### 対応内容

**2026-02-22完了**: `lib/api/llm-client.ts` を新規作成し、APIクライアント層を導入。

- `lib/api/llm-client.ts` - 新規作成。LLM APIクライアント層
  - `streamLLMResponse(request, options?)` - fetch + SSEパースを一括で行う非同期ジェネレータ
  - `LLMApiError` - HTTPエラーを構造化して保持するエラークラス（ステータスコード・サーバーリクエストID付き）
  - `LLMStreamRequest` - リクエストの型定義
- `components/ui/StreamingMessage.tsx`（`useLLMStream`） - `fetch` 直接呼び出しを `streamLLMResponse()` に置き換え
- `hooks/useLangChainChat.ts` - `useLLMStream` への委譲により間接的に恩恵を受ける

### 改善結果

- `fetch` 呼び出しが `lib/api/llm-client.ts` に集約され、エンドポイント変更・ヘッダー追加が一箇所で済む
- `LLMApiError` によりHTTPエラーが構造化され、エラーの握りつぶしを防止
- `streamLLMResponse` をモックすれば `useLLMStream` の単体テストが容易に

### 関連ファイル

- `lib/api/llm-client.ts` - 新規APIクライアント層
- `components/ui/StreamingMessage.tsx` - `useLLMStream` フックが `streamLLMResponse` を使用
- `hooks/useLangChainChat.ts` - `useLLMStream` 経由でAPIクライアントを使用

---

## 10. ~~ハードコードされた定数~~ ✅ 完了

**優先度: 🟡 低 / 難易度: 🟨 低**

### 対応内容

**2026-02-22完了**: `config/constants.ts` を新規作成し、ハードコードされた定数を一元管理。

| 定数 | 値 | 使用箇所 |
|------|-----|------|
| `CACHE_TTL_MS` | `60 * 1000` | [lib/settings/db.ts](lib/settings/db.ts) |
| `TEXTAREA_MAX_HEIGHT_PX` | `200` | [components/ui/ChatInputArea.tsx](components/ui/ChatInputArea.tsx), [components/chat/ChatInput.tsx](components/chat/ChatInput.tsx) |
| `MAX_FILE_SIZE_MB` | `10` | [components/ui/FileAttachment.tsx](components/ui/FileAttachment.tsx) |

### 関連ファイル

- [config/constants.ts](config/constants.ts) - 新規作成

---

## 11. ~~命名の非一貫性~~ ✅ 完了

**優先度: 🟡 低 / 難易度: 🟨 低**

### 対応内容

- Props型の命名を `コンポーネント名 + Props` に統一
- featureIdのケバブ/キャメル混在: `GrokToolSettings`（#8）の再設計により `featureIdToToolKey` 変換関数が削除され、kebab-case の `ChatFeatureId` をそのまま設定キーとして使用するよう統一

---

## 12. ~~LangChain移行後のフック統合~~ ✅ 完了

**優先度: 🟠 中 / 難易度: ⬛ 高**

**追加日: 2026-02-21**

### 対応内容

**2026-02-22完了**: `useChat.ts` を削除し、`useLangChainChat.ts` に完全統合。

- ~~`hooks/useChat.ts`~~ - 削除済み
- `hooks/useLangChainChat.ts` - 統合版フックとして維持
  - シンプルな状態管理
  - `lib/api/llm-client.ts` を使用

### 改善結果

- フックが1つに統合され、コード重複が解消
- どちらのフックを使用すべきかの判断が不要に
- 機能追加時の実装箇所が明確に

### 関連ファイル

- ~~`hooks/useChat.ts`~~ - 削除済み
- `hooks/useLangChainChat.ts` - 統合版フック
- `lib/api/llm-client.ts` - APIクライアント層

---

## 13. ~~API Routesの完全重複~~ ✅ 完了

**優先度: 🔴 高 / 難易度: 🟨 低**

**追加日: 2026-02-21**

### 対応内容

**2026-02-22完了**: `app/api/llm/langchain/stream/route.ts` を単純なリエクスポートに置き換え。

- `app/api/llm/stream/route.ts` - 正規実装として維持
- `app/api/llm/langchain/stream/route.ts` - `POST` ハンドラと `LangChainStreamRequest` 型を `stream/route` からリエクスポート

### 関連ファイル

- [app/api/llm/stream/route.ts](app/api/llm/stream/route.ts)
- [app/api/llm/langchain/stream/route.ts](app/api/llm/langchain/stream/route.ts)

---

## 14. ~~ChatInputコンポーネントの重複~~ ✅ 完了

**優先度: 🟠 中 / 難易度: 🟫 中**

**追加日: 2026-02-21**

### 対応内容

**2026-02-22完了**: 未使用のChatInput関連コンポーネントを削除し、統合を完了。

### 削除したファイル

| ファイル | 理由 |
|----------|------|
| `components/chat/ChatInput.tsx` | 未使用（`ChatInputArea` に統合済み） |
| `components/chat/ChatUI.tsx` | 未使用（`FeatureChat` に統合済み） |
| `components/chat/types.ts` | 未使用（`index.ts` に統合） |

### 統合後の構成

- `components/ui/ChatInputArea.tsx` - 統合先（唯一のChatInput実装）
- `components/chat/index.ts` - 型定義を含む統合エクスポート
- `components/chat/ChatMessage.tsx` - メッセージ表示（維持）

### 関連ファイル

- ~~`components/chat/ChatInput.tsx`~~ - 削除済み
- ~~`components/chat/ChatUI.tsx`~~ - 削除済み
- ~~`components/chat/types.ts`~~ - 削除済み（`index.ts` に統合）

---

## 15. ~~EmptyStateコンポーネントの重複~~ ✅ 完了

**優先度: 🟡 低 / 難易度: 🟨 低**

**追加日: 2026-02-21**

### 対応内容

**2026-02-22完了**: `components/ui/EmptyState.tsx` を共通基盤として新規作成し、両コンポーネントを統合。

| コンポーネント | 変更内容 |
|---------------|----------|
| `components/ui/EmptyState.tsx` | 新規作成。`suggestionVariant`・`iconContainerClassName` propsで両用途に対応 |
| `components/chat/EmptyState.tsx` | `components/ui/EmptyState` の再エクスポートに変更 |
| `components/research/EmptyState.tsx` | `components/ui/EmptyState` を使った薄いラッパーに変更 |

### 関連ファイル

- [components/ui/EmptyState.tsx](components/ui/EmptyState.tsx) - 共通コンポーネント（新規）
- [components/chat/EmptyState.tsx](components/chat/EmptyState.tsx) - 再エクスポート
- [components/research/EmptyState.tsx](components/research/EmptyState.tsx) - ラッパー

---

## 16. ~~環境変数名の不整合~~ ✅ 完了（実害なし）

**優先度: 🔴 高 / 難易度: 🟨 低**

**追加日: 2026-02-21**

### 問題

Google/Gemini APIキーの環境変数名に不整合があった。

| 場所 | 環境変数名 |
|------|-----------|
| `.env.example`, `.env.local` | `GEMINI_API_KEY` |
| `lib/llm/langchain/config.ts:31` | `GOOGLE_API_KEY` |

### 対応内容

**2026-02-22完了**: #17 の対応（未使用プロバイダーのコメントアウト）により、Gemini/Googleプロバイダー自体が無効化されたため、実質的に解決。

- `lib/llm/langchain/config.ts` - Googleプロバイダー設定をコメントアウト
- `GEMINI_API_KEY` は `.env` から削除可能（使用されていない）

### 関連ファイル

- `lib/llm/langchain/config.ts`
- `.env.example`
- `.env.local`

---

## 17. ~~未使用/空の環境変数~~ ✅ 完了

**優先度: 🟡 低 / 難易度: 🟨 低**

**追加日: 2026-02-21**

### 対応内容

**2026-02-22完了**: 未使用プロバイダー（OpenAI, Anthropic, Gemini）をコメントアウトし、grokのみ使用するように整理。

- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` - コメントアウト済み
- `GEMINI_API_KEY` - コメントアウト済み（環境変数名不整合#16も解決）
- `GROK_API_KEY` - 唯一有効なプロバイダーとして維持

### 関連ファイル

- `lib/llm/types.ts` - `VALID_PROVIDERS` をgrokのみに
- `lib/llm/config.ts` - 全プロバイダー設定をコメントアウト
- `lib/llm/langchain/config.ts` - 同様にgrokのみに
- `components/ui/LLMSelector.tsx` - grok以外をコメントアウト
- `components/ui/ModelSelector.tsx` - grok以外をコメントアウト

---

## 18. ~~perplexity→grokへの移行~~ ✅ 完了

**優先度: 🟠 中 / 難易度: 🟫 中**

**追加日: 2026-02-22**

### 対応内容

リサーチ機能で使用していたperplexityプロバイダーをgrokに変更。

- `lib/research/config.ts` - perplexity→grokに変更
- `lib/research/constants.ts` - perplexity→grokに変更
- `lib/research/prompts.ts` - perplexity→grokに変更

### 改善結果

- プロバイダーがgrokのみに統一され、設定が簡素化
- 複数プロバイダーの管理コストが削減

---

## 関連性・重複性マップ

各課題は独立しているわけではなく、同一ファイル・同一コンテキストで絡み合っている。以下に依存関係と重複を整理する。

### 依存グラフ

```
#4 ~~handleStream肥大化~~ ✅ 完了
  ├── #7 ~~状態の三重管理~~ ✅ 完了
  └── #9 ~~fetchの直接呼び出し~~ ✅ 完了
  └── #12 ~~LangChain統合~~ ✅ 完了

#8 GrokToolSettings設計問題
  ├── #5 as unknownキャスト （型設計の不備がキャストを強制している根本原因）
  └── #11 命名の非一貫性    （featureIdのケバブ/キャメル混在はGrokToolSettingsの変換関数に起因）

#6 エラーの握りつぶし
  └── #9 fetchの直接呼び出し（APIクライアント層に集約するとエラーハンドリングも統一できる）

#10 ハードコードされた定数
  └── #11 命名の非一貫性    （どちらも軽微・独立しており同時対応が効率的）

#12 ~~LangChain統合~~ ✅ 完了
  ├── #4 ~~handleStream肥大化~~ ✅ 完了
  ├── #7 ~~状態の三重管理~~ ✅ 完了
  └── #9 ~~fetchの直接呼び出し~~ ✅ 完了

#13 API Routes重複
  └── #12 LangChain統合     （API統合はフック統合と並行して実施可能）

#14 ChatInput重複
  └── #12 LangChain統合     （UI統合はフック統合後に実施が効率的）

#16 環境変数不整合
  └── #8 GrokToolSettings   （設定周りはまとめて対応すると効率的）
```

### 一緒に実装すべきグループ

#### ~~グループA: `useChat.ts` の大整理~~ ― **~~#4 + #7 + #12~~** ✅ 完了

**根拠:** `handleStream`（#4）の肥大化の直接原因のひとつが、関数内で `isLoading` / `isStreaming` / `streamState` の3つを個別に更新していること（#7）。さらにLangChain移行後（#12）のフック統合を見据えた設計が必要。

**2026-02-22完了**: `useChat.ts` を削除し、`useLangChainChat.ts` に統合。APIクライアント層（`lib/api/llm-client.ts`）を導入。

- ~~`useReducer` で `status: 'idle' | 'loading' | 'streaming' | 'done' | 'error'` に集約~~
- ~~`handleStream` をオーケストレーターに薄くする~~
- ~~`useLangChainChat.ts` との統合方針を決定~~
- `useChat.ts` を削除し、`useLangChainChat.ts` に統合
- `lib/api/llm-client.ts` を新規作成し、APIクライアント層を導入

#### ~~グループB: `lib/settings/db.ts` の一括修正~~ ― **~~#5 + #6~~** ✅ 完了

**根拠:** #5（`as unknown` キャスト）と #6（エラーの握りつぶし）はともに `lib/settings/db.ts` に集中している。同一ファイルを2回触るより1回で対応するほうが効率的。

**2026-02-22完了**: `as unknown` キャスト除去・エラーハンドリング統一を実施。

#### ~~グループC: 設定スキーマ再設計~~ ― **~~#8 + #11（featureId部分）~~** ✅ 完了

**根拠:** `GrokToolSettings`（#8）を再設計すると `featureIdToToolKey` の変換関数が不要になり、ケバブケース/キャメルケース混在（#11 の featureId 部分）も自然に解消する。

**2026-02-22完了**: `GrokToolSettings` を 32 boolean フィールドから `Record<ChatFeatureId, GrokToolType[]>` に再設計。Prismaスキーマ・管理UI・API Routeをすべて新構造に対応。変換関数 `featureIdToToolKey` / `getToolSettingKey` を削除し、featureId の命名が kebab-case に統一された。

#### ~~グループD: APIクライアント層の導入~~ ― **~~#9 + #6（API呼び出し部分）+ #12~~** ✅ 完了

**根拠:** `fetch` を `lib/api/llm-client.ts` に集約（#9）すると、HTTPリクエスト周りのエラーハンドリングを一か所で統一でき、#6 の問題の一部が自動解決する。さらに #12 のLangChain統合もAPIクライアント層で抽象化できる。

**2026-02-22完了**:
- `lib/api/llm-client.ts` を新規作成。`streamLLMResponse()` 関数と `LLMApiError` クラスで fetch・SSEパース・エラーハンドリングを一元化
- `components/ui/StreamingMessage.tsx`（`useLLMStream`）の直接 `fetch` 呼び出しを `streamLLMResponse()` に置き換え
- `hooks/useLangChainChat.ts` は既に `useLLMStream` に委譲済みのため追加変更不要
- `hooks/useChat.ts`（レガシー・未使用）は既に削除済みを確認

#### ~~グループE: コードクリーンアップ~~ ― **~~#10 + #11（Props命名部分）+ #15 + #17~~** ✅ 完了

**根拠:** どちらも単一ファイル内で完結する軽微な変更。コンテキストの切り替えコストが低いため、一括でクリーンアップするのが効率的。

**2026-02-22完了**:
- #10: `config/constants.ts` を新規作成し、ハードコード定数を一元管理
- #11: Props型命名を統一、featureIdのケバブ/キャメル混在を解消（#8と連動）
- #15: `components/ui/EmptyState.tsx` を新規作成し、重複を解消
- #17: 未使用プロバイダー（OpenAI, Anthropic, Gemini）をコメントアウト

#### ~~グループF: API Routes統合~~ ― **~~#13~~** ✅ 完了

**根拠:** `app/api/llm/stream/route.ts` と `app/api/llm/langchain/stream/route.ts` は完全に重複している。即座に統合可能で、影響範囲も限定されている。

**2026-02-22完了**: `app/api/llm/langchain/stream/route.ts` を `stream/route` へのリエクスポートに置き換え。実際のコードからは `/api/llm/langchain/stream` への参照がなく、後方互換性も維持。

#### グループG: UIコンポーネント統合 ― **#14**

**根拠:** ChatInput（#14）はUIコンポーネントの重複。`components/ui/ChatInputArea.tsx` を基盤に統合する。

- `components/ui/ChatInputArea.tsx` をベースに統合
- `components/chat/ChatInput.tsx` を統合または削除
- `components/research/ResearchChat.tsx` を `ChatInputArea` に移行

#### ~~グループH: 設定・環境変数整理~~ ― **~~#16 + #17~~** ✅ 完了

**根拠:** 環境変数名の不整合（#16）と未使用変数（#17）は設定周りの整理。まとめて対応すると効率的。

**2026-02-22完了**: #17の対応（未使用プロバイダーのコメントアウト）により、#16も実質的に解決。Gemini/Googleプロバイダー自体が無効化された。

---

## まとめ・対応ロードマップ

| # | 課題 | 優先度 | 難易度 | 実装グループ | ステータス |
|---|------|--------|--------|------------|-----------|
| 1 | ~~SSEストリーム処理の重複~~ | 🔴 高 | 🟫 中 | 単独 | ✅ 完了 |
| 2 | ~~ツール設定の重複定義~~ | 🔴 高 | 🟨 低 | 単独 | ✅ 完了 |
| 3 | ~~`FeatureChat.tsx` の肥大化~~ | 🔴 高 | ⬛ 高 | 単独 | ✅ 完了 |
| 4 | ~~`handleStream` 関数の肥大化~~ | 🔴 高 | ⬛ 高 | **グループA** | ✅ 完了 |
| 5 | ~~`as unknown` キャストの多用~~ | 🔴 高 | 🟫 中 | **グループB** | ✅ 完了 |
| 6 | ~~エラーの握りつぶし~~ | 🟠 中 | 🟨 低 | **グループB / D** | ✅ 完了 |
| 7 | ~~状態の二重・三重管理~~ | 🟠 中 | 🟫 中 | **グループA** | ✅ 完了 |
| 8 | ~~`GrokToolSettings` の設計問題~~ | 🟠 中 | ⬛ 高 | **グループC** | ✅ 完了 |
| 9 | ~~`fetch` の直接呼び出し~~ | 🟠 中 | ⬛ 高 | **グループD** | ✅ 完了 |
| 10 | ~~ハードコードされた定数~~ | 🟡 低 | 🟨 低 | **グループE** | ✅ 完了 |
| 11 | ~~命名の非一貫性~~ | 🟡 低 | 🟨 低 | **グループC / E** | ✅ 完了 |
| 12 | ~~LangChain移行後のフック統合~~ | 🟠 中 | ⬛ 高 | **グループA / D** | ✅ 完了 |
| 13 | ~~API Routesの完全重複~~ | 🔴 高 | 🟨 低 | **グループF** | ✅ 完了 |
| 14 | ~~ChatInputコンポーネントの重複~~ | 🟠 中 | 🟫 中 | **グループG** | ✅ 完了 |
| 15 | ~~EmptyStateコンポーネントの重複~~ | 🟡 低 | 🟨 低 | **グループE** | ✅ 完了 |
| 16 | ~~環境変数名の不整合~~ | 🔴 高 | 🟨 低 | **グループH** | ✅ 完了（実害なし） |
| 17 | ~~未使用/空の環境変数~~ | 🟡 低 | 🟨 低 | **グループH** | ✅ 完了 |
| 18 | ~~perplexity→grokへの移行~~ | 🟠 中 | 🟫 中 | **グループH** | ✅ 完了 |
| 19 | ~~旧Research版のAgent版統合~~ | 🟠 中 | 🟫 中 | - | ✅ 完了 |

### 推奨対応順序

1. **~~グループH~~** (~~環境変数修正~~): ~~#16~~ ― ✅ **完了**（#17で実質解決）
2. **~~グループF~~** (~~API Routes統合~~): ~~#13~~ ― ✅ **完了**
3. **~~グループB~~** (~~`lib/settings/db.ts` 一括修正~~): ~~#5 + #6~~ ― ✅ **完了**
4. **~~グループA/D~~** (~~フック統合・APIクライアント層~~): ~~#4 + #7 + #9 + #12~~ ― ✅ **完了**
5. **~~グループC~~** (~~設定スキーマ再設計~~): ~~#8 + #11（featureId）~~ ― ✅ **完了**
6. **~~グループE~~** (~~コードクリーンアップ~~): ~~#10 + #11（Props命名）+ #15 + #17~~ ― ✅ **完了**
7. **~~グループG~~** (~~UIコンポーネント統合~~): ~~#14~~ ― ✅ **完了**

### リファクタリング完了に伴う特記事項

**2026-02-22更新**:

- ✅ LangChain移行が完了し、全機能がLangChainベースで動作
- ✅ `useChat.ts` を削除し、`useLangChainChat.ts` に統合完了
- ✅ APIクライアント層（`lib/api/llm-client.ts`）を導入完了
- ✅ プロバイダーをgrokのみに統一（OpenAI, Anthropic, Geminiをコメントアウト）
- ✅ リサーチ機能のperplexity→grok移行完了
- ✅ `lib/settings/db.ts` の `as unknown` キャスト除去・エラーハンドリング統一完了
- ✅ `GrokToolSettings` を 32 boolean フィールド → `Record<ChatFeatureId, GrokToolType[]>` に再設計完了
- ✅ `featureIdToToolKey` / `getToolSettingKey` 変換関数を削除、featureId 命名を kebab-case に統一
- ✅ `config/constants.ts` を新規作成し、ハードコード定数を一元管理
- ✅ `components/ui/EmptyState.tsx` を新規作成し、EmptyStateの重複を解消
- ✅ `app/api/llm/langchain/stream/route.ts` をリエクスポートに置き換え、API Routesの重複を解消
- ✅ `components/research/ChatInput.tsx` を削除し、`ResearchChat` が `components/chat/ChatInput.tsx` を使用するように変更
- ✅ `lib/chat/agents.ts` を新規作成し、用語を "Gem" から "Agent" に変更
- ✅ 旧Research版（`/research`）を廃止し、Agent版（`/agent/*`）に統合
- ✅ `components/research/` を削除、`hooks/useResearchChat.ts` を削除
- ✅ `components/chat/ChatInput.tsx` を削除（未使用）
- ✅ `components/chat/ChatUI.tsx` を削除（未使用）
- ✅ `components/chat/types.ts` を削除（`index.ts` に統合）

**完了した項目**: #1, #2, #3, #4, #5, #6, #7, #8, #9, #10, #11, #12, #13, #14, #15, #16, #17, #18, #19

**残存する項目**: なし（すべて完了）

### 完了したリファクタリング

すべてのリファクタリング候補が完了しました。

---

## 19. ~~旧Research版（/research）を廃止し、Agent版（/agent/*）に統合~~ ✅ 完了

**優先度: 🟠 中 / 難易度: 🟫 中**

**追加日: 2026-02-22**

### 対応内容

**2026-02-22完了**: 旧Research版を廃止し、Agent版に統合。用語も"Gem"から"Agent"に変更。

#### 背景

リサーチ機能が2系統で実装されていた：

| 系統 | URL | 実装 | 特徴 |
|------|-----|------|------|
| **旧Research版** | `/research` | `ResearchChat.tsx` + `useResearchChat.ts` | タブ切替、履歴なし |
| **新Agent版（旧Gem版）** | `/research/cast`, etc. | `ChatPage.tsx` + `FeatureChat.tsx` | ページ遷移、履歴あり、統一UI |

#### 実施した変更

| ファイル | 変更内容 |
|----------|----------|
| `lib/chat/agents.ts` | 新規作成。`lib/chat/gems.ts` の後継。型名・関数名を `Agent` に変更 |
| `app/(authenticated)/agent/cast/page.tsx` | 新規作成。`research-cast` 機能 |
| `app/(authenticated)/agent/location/page.tsx` | 新規作成。`research-location` 機能 |
| `app/(authenticated)/agent/info/page.tsx` | 新規作成。`research-info` 機能 |
| `app/(authenticated)/agent/evidence/page.tsx` | 新規作成。`research-evidence` 機能 |
| `app/(authenticated)/agent/page.tsx` | 新規作成。`/agent/cast` へリダイレクト |
| `app/(authenticated)/research/page.tsx` | `/agent/cast` へリダイレクトに変更 |
| `app/(authenticated)/chat/page.tsx` | `gem` → `agent` パラメータに変更。`lib/chat/agents` を使用 |
| `app/(authenticated)/research/layout.tsx` | 削除 |
| `app/(authenticated)/research/cast/` | 削除 |
| `app/(authenticated)/research/location/` | 削除 |
| `app/(authenticated)/research/info/` | 削除 |
| `app/(authenticated)/research/evidence/` | 削除 |
| `components/research/` | 削除（`ResearchChat.tsx`, `AgentTabs.tsx`, `EmptyState.tsx`, `hooks/`, `message/`） |
| `hooks/useResearchChat.ts` | 削除 |
| `lib/chat/gems.ts` | 維持（後方互換性のため）。`lib/chat/agents.ts` からエイリアスをエクスポート |

#### 用語変更

| 旧 | 新 |
|----|----|
| `Gem` | `Agent` |
| `GemId` | `AgentId` |
| `GEMS` | `AGENTS` |
| `getGemById()` | `getAgentById()` |
| `isProposalGem()` | `isProposalAgent()` |
| `getResearchGems()` | `getResearchAgents()` |
| URLパラメータ `?gem=xxx` | `?agent=xxx` |
| パス `/research/*` | `/agent/*` |

#### 後方互換性

`lib/chat/gems.ts` は維持し、`lib/chat/agents.ts` からのエイリアスをエクスポート：

```typescript
/** @deprecated Use AgentId instead */
export type GemId = AgentId;
/** @deprecated Use AGENTS instead */
export const GEMS = AGENTS;
// ... etc
```

### 関連ファイル

- [lib/chat/agents.ts](lib/chat/agents.ts) - 新規作成（Agent定義の正規版）
- [lib/chat/gems.ts](lib/chat/gems.ts) - 後方互換性のため維持（エイリアスのみ）
- [app/(authenticated)/agent/](app/(authenticated)/agent/) - 新規作成
- ~~`app/(authenticated)/research/`~~ - 削除（`page.tsx` のみリダイレクトとして残存）
- ~~`components/research/`~~ - 削除
- ~~`hooks/useResearchChat.ts`~~ - 削除
