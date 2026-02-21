# リファクタリング候補一覧

> 対象範囲: `agent1` アプリ全体（admin管理画面を除く）
> 作成日: 2026-02-21
> **更新日: 2026-02-21 23:40** - LangChain移行完了に伴う更新

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

## 4. `useChat.ts` の `handleStream` 関数の肥大化

**優先度: 🔴 高 / 難易度: ⬛ 高**

### 問題

[hooks/useChat.ts](hooks/useChat.ts) の `handleStream` 関数が約240行（行49〜288）に及び、以下の処理が1関数に集中している。

- SSEストリームの読み取り（`parseSSEStream`使用済み）
- ツール呼び出しの状態管理（`toolCallsMap`）
- 思考ステップの逐次更新
- エラーハンドリング
- 完了後の後処理
- 処理ステップ（ProcessingStep）の状態管理

### LangChain移行後の状況

**2026-02-21更新**: LangChain移行が完了しましたが、`useChat.ts` は従来のAPIエンドポイント (`/api/llm/stream`) を引き続き使用しています。

- `hooks/useLangChainChat.ts` - 新規作成。LangChain用API (`/api/llm/langchain/stream`) を使用
- `hooks/useChat.ts` - 従来の実装を維持。レガシーAPIを使用

### 改善方向

**オプションA**: `useChat.ts` を `useLangChainChat.ts` に統合し、従来のAPIもLangChain経由で呼び出す

**オプションB**: `handleStream` 関数を以下のように分割
- `lib/llm/stream-processor.ts` - ストリーム処理のコアロジック
- `lib/llm/tool-call-manager.ts` - ツール呼び出し状態管理
- `lib/llm/reasoning-processor.ts` - 思考ステップ処理

### 関連ファイル

- `hooks/useChat.ts` - 対象ファイル
- `hooks/useLangChainChat.ts` - LangChain版フック（参考実装）
- `lib/llm/sse-parser.ts` - 既存のSSEパーサー

---

## 5. `as unknown` キャストの多用

**優先度: 🔴 高 / 難易度: 🟫 中**

### 問題

[lib/settings/db.ts](lib/settings/db.ts) の約行289〜293で、Prismaクライアントに対して `as unknown as { ... }` という危険なキャストを行っている。これはPrismaの型定義がモデルに追従していないことが原因と思われる。

### 詳細

実行時に型の不一致があっても TypeScript のチェックをすり抜けるため、バグの発見が遅れるリスクがある。

### 改善方向

Prismaのスキーマとクライアント生成の整合性を確認し、適切な型定義を追加する。どうしても回避できない場合は型アサーションの範囲を最小化し、コメントで理由を明記する。

---

## 6. エラーの握りつぶし

**優先度: 🟠 中 / 難易度: 🟨 低**

### 問題

[lib/settings/db.ts](lib/settings/db.ts) の複数箇所でエラーが発生しても `null` を返すだけで、エラー情報が失われている（約行74〜76）。一方で `console.error` のみでログを出す箇所（約行300〜302）も存在し、エラーハンドリングが統一されていない。

### 詳細

- 一部: `catch { return null; }` → エラー情報がすべて失われる
- 一部: `catch (error) { console.error(...); }` → ログはあるが呼び出し元に通知されない
- 一部: 詳細なエラーメッセージを含む `throw new Error(...)` → 適切

### 改善方向

エラーハンドリングの方針を統一する。少なくともエラーは構造化ログに記録し、呼び出し元が適切にハンドリングできる形でスローする。

---

## 7. 状態の二重・三重管理

**優先度: 🟠 中 / 難易度: 🟫 中**

### 問題

[hooks/useChat.ts](hooks/useChat.ts) の行20〜34付近で、ローディング/ストリーミング状態を表すフラグが複数の形で管理されている。

- `isLoading` (useState)
- `isStreaming` (useState)
- `streamState.isComplete` (useState内のオブジェクト)

これらは本質的に同じ「現在の処理状態」を表しており、更新タイミングのズレが生じると整合性が崩れる。

### LangChain移行後の状況

**2026-02-21更新**: `hooks/useLangChainChat.ts` ではシンプルな状態管理（`isLoading` のみ）を採用しています。

### 改善方向

単一の状態（例: `status: 'idle' | 'loading' | 'streaming' | 'done' | 'error'`）に集約し、`useReducer` で管理する。

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

## 9. `fetch` の直接呼び出し（テスト困難）

**優先度: 🟠 中 / 難易度: ⬛ 高**

### 問題

[hooks/useChat.ts](hooks/useChat.ts)（約行109〜114）と [hooks/useLangChainChat.ts](hooks/useLangChainChat.ts)（約行155〜165）で、`fetch("/api/llm/stream", ...)` および `fetch("/api/llm/langchain/stream", ...)` が直接呼び出されている。これによりHTTPリクエストとUIロジックが密結合しており、単体テストが困難。

### LangChain移行後の状況

**2026-02-21更新**: LangChain移行後も、2つのフックで別々に `fetch` を直接呼び出しています。

| フック | APIエンドポイント | 用途 |
|--------|------------------|------|
| `useChat.ts` | `/api/llm/stream` | 従来のLLM API |
| `useLangChainChat.ts` | `/api/llm/langchain/stream` | LangChain版API |

### 改善方向

APIクライアント層（例: `lib/api/llmClient.ts`）を設けてHTTPリクエストを集約し、フックはそのクライアントを受け取る形（依存性注入）にする。

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

## 12. LangChain移行後のフック統合（新規）

**優先度: 🟠 中 / 難易度: ⬛ 高**

**追加日: 2026-02-21**

### 問題

LangChain移行完了後、`useChat.ts`（従来API用）と `useLangChainChat.ts`（LangChain API用）の2つの類似フックが並存している。これにより以下の問題がある：

- コード重複（SSEストリーム処理、エラーハンドリング等）
- 機能追加時の二重実装が必要
- どちらを使用すべきかの判断が複雑

### 現在の実装状況

| 項目 | `useChat.ts` | `useLangChainChat.ts` |
|------|-------------|----------------------|
| APIエンドポイント | `/api/llm/stream` | `/api/llm/langchain/stream` |
| SSEパーサー | `parseSSEStream` | 独自実装（行80〜111） |
| 状態管理 | 複雑（#7参照） | シンプル（`isLoading`のみ） |
| ツール呼び出し表示 | 対応済み | 未対応 |
| 思考ステップ | 対応済み | 未対応 |

### 改善方向

**フェーズ1**: `useLangChainChat.ts` に不足機能（ツール呼び出し、思考ステップ）を追加

**フェーズ2**: 共通処理を抽出し、フックを統合または抽象化

### 関連ファイル

- `hooks/useChat.ts` - 従来フック
- `hooks/useLangChainChat.ts` - LangChainフック
- `lib/llm/langchain/adapter.ts` - アダプター（参考）

---

## 関連性・重複性マップ

各課題は独立しているわけではなく、同一ファイル・同一コンテキストで絡み合っている。以下に依存関係と重複を整理する。

### 依存グラフ

```
#4 handleStream肥大化
  ├── #7 状態の三重管理     （handleStream内でisLoading/isStreaming/streamStateを操作）
  └── #9 fetchの直接呼び出し（handleStream内にfetch呼び出しが埋め込まれている）
  └── #12 LangChain統合     （useLangChainChat.tsとの統合が必要）

#8 GrokToolSettings設計問題
  ├── #5 as unknownキャスト （型設計の不備がキャストを強制している根本原因）
  └── #11 命名の非一貫性    （featureIdのケバブ/キャメル混在はGrokToolSettingsの変換関数に起因）

#6 エラーの握りつぶし
  └── #9 fetchの直接呼び出し（APIクライアント層に集約するとエラーハンドリングも統一できる）

#10 ハードコードされた定数
  └── #11 命名の非一貫性    （どちらも軽微・独立しており同時対応が効率的）

#12 LangChain統合
  ├── #4 handleStream肥大化 （統合時に解消される可能性）
  ├── #7 状態の三重管理     （useLangChainChat.tsはシンプルな状態管理）
  └── #9 fetchの直接呼び出し（APIクライアント層の導入機会）
```

### 一緒に実装すべきグループ

#### グループA: `useChat.ts` の大整理 ― **#4 + #7 + #12**

**根拠:** `handleStream`（#4）の肥大化の直接原因のひとつが、関数内で `isLoading` / `isStreaming` / `streamState` の3つを個別に更新していること（#7）。さらにLangChain移行後（#12）のフック統合を見据えた設計が必要。

- `useReducer` で `status: 'idle' | 'loading' | 'streaming' | 'done' | 'error'` に集約
- `handleStream` をオーケストレーターに薄くする
- `useLangChainChat.ts` との統合方針を決定

#### グループB: `lib/settings/db.ts` の一括修正 ― **#5 + #6**

**根拠:** #5（`as unknown` キャスト）と #6（エラーの握りつぶし）はともに `lib/settings/db.ts` に集中している。同一ファイルを2回触るより1回で対応するほうが効率的。

#### グループC: 設定スキーマ再設計 ― **#8 + #11（featureId部分）**

**根拠:** `GrokToolSettings`（#8）を再設計すると `featureIdToToolKey` の変換関数が不要になり、ケバブケース/キャメルケース混在（#11 の featureId 部分）も自然に解消する。

#### グループD: APIクライアント層の導入 ― **#9 + #6（API呼び出し部分）+ #12**

**根拠:** `fetch` を `lib/api/llmClient.ts` に集約（#9）すると、HTTPリクエスト周りのエラーハンドリングを一か所で統一でき、#6 の問題の一部が自動解決する。さらに #12 のLangChain統合もAPIクライアント層で抽象化できる。

#### グループE: コードクリーンアップ ― **#10 + #11（Props命名部分）**

**根拠:** どちらも単一ファイル内で完結する軽微な変更。コンテキストの切り替えコストが低いため、一括でクリーンアップするのが効率的。

---

## まとめ・対応ロードマップ

| # | 課題 | 優先度 | 難易度 | 実装グループ | ステータス |
|---|------|--------|--------|------------|-----------|
| 1 | ~~SSEストリーム処理の重複~~ | 🔴 高 | 🟫 中 | 単独 | ✅ 完了 |
| 2 | ~~ツール設定の重複定義~~ | 🔴 高 | 🟨 低 | 単独 | ✅ 完了 |
| 3 | ~~`FeatureChat.tsx` の肥大化~~ | 🔴 高 | ⬛ 高 | 単独 | ✅ 完了 |
| 4 | `handleStream` 関数の肥大化 | 🔴 高 | ⬛ 高 | **グループA** | 対応待ち |
| 5 | `as unknown` キャストの多用 | 🔴 高 | 🟫 中 | **グループB** | 対応待ち |
| 6 | エラーの握りつぶし | 🟠 中 | 🟨 低 | **グループB / D** | 対応待ち |
| 7 | 状態の二重・三重管理 | 🟠 中 | 🟫 中 | **グループA** | 対応待ち |
| 8 | `GrokToolSettings` の設計問題 | 🟠 中 | ⬛ 高 | **グループC** | 対応待ち |
| 9 | `fetch` の直接呼び出し | 🟠 中 | ⬛ 高 | **グループD** | 対応待ち |
| 10 | ハードコードされた定数 | 🟡 低 | 🟨 低 | **グループE** | 対応待ち |
| 11 | ~~命名の非一貫性~~ | 🟡 低 | 🟨 低 | **グループC / E** | ✅ 完了 |
| 12 | LangChain移行後のフック統合 | 🟠 中 | ⬛ 高 | **グループA / D** | 対応待ち |

### 推奨対応順序

1. **グループB** (`lib/settings/db.ts` 一括修正): #5 + #6 ― 同一ファイルで完結、高優先度
2. **グループA/D** (フック統合・APIクライアント層): #4 + #7 + #9 + #12 ― 関連性が高いため一括対応
3. **グループC** (設定スキーマ再設計): #8 + #11（featureId）― 大規模改修のため単独スプリントで対応
4. **グループE** (コードクリーンアップ): #10 + #11（Props命名）― いつでも対応可能

### LangChain移行完了に伴う特記事項

**2026-02-21更新**:

- LangChain移行は完了し、新しいフック `useLangChainChat.ts` が作成されました
- 従来の `useChat.ts` はレガシーAPIを使用し続けています
- 推奨される対応:
  1. まずAPIクライアント層（#9）を導入
  2. その上で `useChat.ts` と `useLangChainChat.ts` を統合（#12）
  3. 統合時に状態管理（#7）と `handleStream` の肥大化（#4）も解消
