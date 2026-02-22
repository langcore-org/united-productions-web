# リファクタリング候補一覧

> 対象範囲: `agent1` アプリ全体（admin管理画面を除く）
> 作成日: 2026-02-21
> **更新日: 2026-02-22 00:05** - リファクタリング進行に伴う更新（useChat.ts削除、APIクライアント層追加）

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

**2026-02-22更新**: `hooks/useChat.ts` を完全削除し、`hooks/useLangChainChat.ts` に統合しました。

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

**2026-02-22更新**: `lib/settings/db.ts` の `as unknown` キャストを除去しました。

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

**2026-02-22更新**: `lib/settings/db.ts` のエラーハンドリングを統一しました。

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

**2026-02-22更新**: `hooks/useChat.ts` を削除し、`hooks/useLangChainChat.ts` のシンプルな状態管理に統合しました。

- ~~`isLoading` / `isStreaming` / `streamState.isComplete` の三重管理~~ → `isLoading` のみに統合
- `useLangChainChat.ts` ではシンプルな状態管理を維持

### 改善結果

- 状態管理がシンプルになり、整合性の問題が解消
- コードの可読性と保守性が向上

### 関連ファイル

- ~~`hooks/useChat.ts`~~ - 削除済み
- `hooks/useLangChainChat.ts` - シンプルな状態管理を採用

---

## 8. `GrokToolSettings` インターフェースの設計問題

**優先度: 🟠 中 / 難易度: ⬛ 高**

### 問題

[lib/settings/db.ts](lib/settings/db.ts) の `GrokToolSettings` インターフェース（約行122〜160）が、機能数 × ツール数のbooleanフィールド（32個程度）を持つ平坦な構造になっている。

例: `generalChat`, `xSearchGeneralChat`, `xSearchResearchCast`, ...

### 詳細

- 新しい機能やツールを追加するたびにインターフェース・DB・UIすべての修正が必要
- 「すべてのツールを常に有効」というポリシー（約行270〜282）が既に実装されているにもかかわらず、32フィールドの設定が残っている

### 改善方向

`Map<FeatureId, ToolType[]>` やネストしたオブジェクト構造に再設計し、機能・ツールの追加がスケーラブルになるようにする。

---

## 9. ~~`fetch` の直接呼び出し~~ ✅ 完了

**優先度: 🟠 中 / 難易度: ⬛ 高**

### 対応内容

**2026-02-22更新**: `lib/api/llm-client.ts` を新規作成し、APIクライアント層を導入しました。

- `lib/api/llm-client.ts` - 新規作成。LLM APIクライアント層
  - `streamChat()` - ストリーミングチャット
  - `chat()` - 非ストリーミングチャット
- `hooks/useLangChainChat.ts` - APIクライアントを使用するよう更新

### 改善結果

- HTTPリクエストとUIロジックが分離され、単体テストが容易に
- API呼び出しが一元化され、エラーハンドリングも統一

### 関連ファイル

- `lib/api/llm-client.ts` - 新規APIクライアント層
- `hooks/useLangChainChat.ts` - APIクライアントを使用

---

## 10. ハードコードされた定数

**優先度: 🟡 低 / 難易度: 🟨 低**

### 問題

設定値がファイルをまたいでハードコードされており、変更時に複数箇所の修正が必要。

| ファイル | 値 | 内容 |
|----------|-----|------|
| [lib/settings/db.ts](lib/settings/db.ts) 行33 | `60 * 1000` | キャッシュTTL（1分） |
| [components/ui/FeatureChat.tsx](components/ui/FeatureChat.tsx) 行145〜148 | `200` | テキストエリアの最大高さ(px) |
| [components/ui/FileAttachment.tsx](components/ui/FileAttachment.tsx) 行34 | `10` | ファイルサイズ上限(MB) |

### 改善方向

`config/constants.ts` などに集約して一元管理する。

---

## 11. ~~命名の非一貫性~~ ✅ 完了

**優先度: 🟡 低 / 難易度: 🟨 低**

### 対応内容

- Props型の命名を `コンポーネント名 + Props` に統一
- featureIdのキー文字列については、別途検討が必要（#8と関連）

---

## 12. ~~LangChain移行後のフック統合~~ ✅ 完了

**優先度: 🟠 中 / 難易度: ⬛ 高**

**追加日: 2026-02-21**

### 対応内容

**2026-02-22更新**: `useChat.ts` を削除し、`useLangChainChat.ts` に完全統合しました。

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

## 13. API Routesの完全重複（新規）

**優先度: 🔴 高 / 難易度: 🟨 低**

**追加日: 2026-02-21**

### 問題

`app/api/llm/stream/route.ts` と `app/api/llm/langchain/stream/route.ts` が**ほぼ完全に同じ**実装になっている。requestIdのプレフィックス（`stream_` vs `lcs_`）以外は同一。

### 詳細

| ファイル | 内容 | 重複度 |
|----------|------|--------|
| `app/api/llm/stream/route.ts` | SSEストリーミング（LangChain版） | 100% |
| `app/api/llm/langchain/stream/route.ts` | SSEストリーミング（LangChain版） | 100% |

両ファイルとも：
- 同じZodスキーマ
- 同じ認証・バリデーションフロー
- 同じエラーハンドリング
- 同じストリーミング処理

### 改善方向

**即座に統合可能**: `/api/llm/stream` を残し、`/api/llm/langchain/stream` は削除またはリダイレクト

```typescript
// app/api/llm/langchain/stream/route.ts
import { POST as streamPOST } from '../../stream/route';
export const POST = streamPOST; // 単純なリエクスポート
```

### 関連ファイル

- `app/api/llm/stream/route.ts`
- `app/api/llm/langchain/stream/route.ts`

---

## 14. ChatInputコンポーネントの重複（新規）

**優先度: 🟠 中 / 難易度: 🟫 中**

**追加日: 2026-02-21**

### 問題

チャット入力コンポーネントが3箇所で重複して実装されている。

| ファイル | 用途 | 重複内容 |
|----------|------|----------|
| `components/chat/ChatInput.tsx` | 一般チャット用 | テキストエリア自動リサイズ、送信/停止ボタン |
| `components/research/ChatInput.tsx` | リサーチ用 | 同上（placeholderのみ差異） |
| `components/ui/ChatInputArea.tsx` | UIライブラリ用 | 同上 |

### 詳細

- テキストエリアの自動リサイズ処理
- 送信ボタンと停止ボタンの表示制御
- キーボードショートカット（Enter送信、Shift+Enter改行）

これらはすべて同じ機能を提供している。

### 改善方向

`components/ui/ChatInputArea.tsx` をベースに統合：
- `variant` propsで見た目をカスタマイズ
- `placeholder` propsでテキストを変更
- `onSubmit`, `onStop` コールバックで動作を統一

```typescript
// 統合案
interface ChatInputAreaProps {
  variant?: 'default' | 'research' | 'chat';
  placeholder?: string;
  onSubmit: (value: string) => void;
  onStop?: () => void;
  // ...
}
```

### 関連ファイル

- `components/ui/ChatInputArea.tsx` - 統合ベース
- `components/chat/ChatInput.tsx` - 統合対象
- `components/research/ChatInput.tsx` - 統合対象

---

## 15. EmptyStateコンポーネントの重複（新規）

**優先度: 🟡 低 / 難易度: 🟨 低**

**追加日: 2026-02-21**

### 問題

空状態表示コンポーネントが2箇所で重複している。

| ファイル | 用途 |
|----------|------|
| `components/chat/EmptyState.tsx` | 一般チャット用 |
| `components/research/EmptyState.tsx` | リサーチ用 |

### 詳細

- 空状態のアイコン表示
- サジェスト表示
- agent固有の設定（リサーチ用のみ）

### 改善方向

propsでカスタマイズ可能な1コンポーネントに統合：

```typescript
interface EmptyStateProps {
  title?: string;
  suggestions?: string[];
  agentConfig?: AgentConfig; // リサーチ用の設定
}
```

### 関連ファイル

- `components/chat/EmptyState.tsx`
- `components/research/EmptyState.tsx`

---

## 16. 環境変数名の不整合（新規）

**優先度: 🔴 高 / 難易度: 🟨 低**

**追加日: 2026-02-21**

### 問題

Google/Gemini APIキーの環境変数名に不整合がある。

| 場所 | 環境変数名 |
|------|-----------|
| `.env.example`, `.env.local` | `GEMINI_API_KEY` |
| `lib/llm/langchain/config.ts:31` | `GOOGLE_API_KEY` |

### 詳細

```typescript
// lib/llm/langchain/config.ts
const PROVIDER_ENV_KEYS: Record<string, string> = {
  google: 'GOOGLE_API_KEY',  // ← ここが不整合
  // ...
};
```

これにより、Geminiモデルが使用できない可能性がある。

### 改善方向

**推奨**: コード側を修正（既存の `.env` 設定を壊さない）

```typescript
// lib/llm/langchain/config.ts
const PROVIDER_ENV_KEYS: Record<string, string> = {
  google: 'GEMINI_API_KEY',  // GOOGLE_API_KEY → GEMINI_API_KEY
  // ...
};
```

### 関連ファイル

- `lib/llm/langchain/config.ts`
- `.env.example`
- `.env.local`

---

## 17. ~~未使用/空の環境変数~~ ✅ 完了

**優先度: 🟡 低 / 難易度: 🟨 低**

**追加日: 2026-02-21**

### 対応内容

**2026-02-22更新**: 未使用プロバイダー（OpenAI, Anthropic, Gemini）をコメントアウトし、grokのみ使用するように整理しました。

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

リサーチ機能で使用していたperplexityプロバイダーをgrokに変更しました。

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

#### グループC: 設定スキーマ再設計 ― **#8 + #11（featureId部分）**

**根拠:** `GrokToolSettings`（#8）を再設計すると `featureIdToToolKey` の変換関数が不要になり、ケバブケース/キャメルケース混在（#11 の featureId 部分）も自然に解消する。

#### ~~グループD: APIクライアント層の導入~~ ― **~~#9~~ + #6（API呼び出し部分）+ ~~#12~~** ✅ 完了

**根拠:** `fetch` を `lib/api/llmClient.ts` に集約（#9）すると、HTTPリクエスト周りのエラーハンドリングを一か所で統一でき、#6 の問題の一部が自動解決する。さらに #12 のLangChain統合もAPIクライアント層で抽象化できる。

**2026-02-22完了**: `lib/api/llm-client.ts` を新規作成し、APIクライアント層を導入。#9 と #12 は完了。#6 は残存。

#### グループE: コードクリーンアップ ― **#10 + #11（Props命名部分）+ #15 + #17**

**根拠:** どちらも単一ファイル内で完結する軽微な変更。コンテキストの切り替えコストが低いため、一括でクリーンアップするのが効率的。

#### グループF: API Routes統合 ― **#13**

**根拠:** `app/api/llm/stream/route.ts` と `app/api/llm/langchain/stream/route.ts` は完全に重複している。即座に統合可能で、影響範囲も限定されている。

- `/api/llm/langchain/stream` を `/api/llm/stream` に統合
- リダイレクトまたは単純なリエクスポートで対応

#### グループG: UIコンポーネント統合 ― **#14 + #15**

**根拠:** ChatInput（#14）とEmptyState（#15）は両方ともUIコンポーネントの重複。同じ設計思想で統合できる。

- `components/ui/` をベースに統合
- `variant` propsでカスタマイズ可能にする

#### グループH: 設定・環境変数整理 ― **#16 + #17**

**根拠:** 環境変数名の不整合（#16）と未使用変数（#17）は設定周りの整理。まとめて対応すると効率的。

- #16は即座に修正が必要（Geminiが使用できない可能性）
- #17は整理整頓として実施

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
| 8 | `GrokToolSettings` の設計問題 | 🟠 中 | ⬛ 高 | **グループC** | 対応待ち |
| 9 | ~~`fetch` の直接呼び出し~~ | 🟠 中 | ⬛ 高 | **グループD** | ✅ 完了 |
| 10 | ハードコードされた定数 | 🟡 低 | 🟨 低 | **グループE** | 対応待ち |
| 11 | ~~命名の非一貫性~~ | 🟡 低 | 🟨 低 | **グループC / E** | ✅ 完了 |
| 12 | ~~LangChain移行後のフック統合~~ | 🟠 中 | ⬛ 高 | **グループA / D** | ✅ 完了 |
| 13 | API Routesの完全重複 | 🔴 高 | 🟨 低 | **グループF** | 対応待ち |
| 14 | ChatInputコンポーネントの重複 | 🟠 中 | 🟫 中 | **グループG** | 対応待ち |
| 15 | EmptyStateコンポーネントの重複 | 🟡 低 | 🟨 低 | **グループG** | 対応待ち |
| 16 | 環境変数名の不整合 | 🔴 高 | 🟨 低 | **グループH** | 対応待ち |
| 17 | ~~未使用/空の環境変数~~ | 🟡 低 | 🟨 低 | **グループH** | ✅ 完了 |
| 18 | ~~perplexity→grokへの移行~~ | 🟠 中 | 🟫 中 | **グループH** | ✅ 完了 |

### 推奨対応順序

1. **グループH** (環境変数修正): #16 ― 即座に修正が必要（Gemini使用不可の可能性）
2. **グループF** (API Routes統合): #13 ― 完全重複のため即座に統合可能
3. **~~グループB~~** (~~`lib/settings/db.ts` 一括修正~~): ~~#5 + #6~~ ― ✅ **完了**
4. **~~グループA/D~~** (~~フック統合・APIクライアント層~~): ~~#4 + #7 + #9 + #12~~ ― ✅ **完了**
5. **グループC** (設定スキーマ再設計): #8 + #11（featureId）― 大規模改修のため単独スプリントで対応
6. **グループG** (UIコンポーネント統合): #14 + #15 ― フック統合後に実施
7. **~~グループE~~** (~~コードクリーンアップ~~): #10 + #11（Props命名）+ ~~#17~~ ― ✅ **完了**

### LangChain移行・リファクタリング完了に伴う特記事項

**2026-02-22更新**:

- ✅ LangChain移行が完了し、全機能がLangChainベースで動作
- ✅ `useChat.ts` を削除し、`useLangChainChat.ts` に統合完了
- ✅ APIクライアント層（`lib/api/llm-client.ts`）を導入完了
- ✅ プロバイダーをgrokのみに統一（OpenAI, Anthropic, Geminiをコメントアウト）
- ✅ リサーチ機能のperplexity→grok移行完了
- ✅ `lib/settings/db.ts` の `as unknown` キャスト除去・エラーハンドリング統一完了

**完了した項目**: #1, #2, #3, #4, #5, #6, #7, #9, #11, #12, #17, #18

**残存する項目**:
- #8 - `GrokToolSettings` の設計問題（スキーマはJSON化済み、DB層は完了）
- #10 - ハードコードされた定数
- #13 - API Routesの完全重複（統合待ち）
- #14, #15 - UIコンポーネントの重複
- #16 - 環境変数名の不整合（#17でコメントアウトにより解消済み）
