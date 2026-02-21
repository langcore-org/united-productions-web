# リファクタリング候補一覧

> 対象範囲: `agent1` アプリ全体（admin管理画面を除く）
> 作成日: 2026-02-21

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

### 問題

SSE（Server-Sent Events）のパース処理が以下の3箇所に重複して存在しており、ロジックの差異・バグ修正の漏れが起きやすい状態になっている。

- [components/ui/StreamingMessage.tsx](components/ui/StreamingMessage.tsx) — 約行155〜246
- [hooks/useChat.ts](hooks/useChat.ts) — 約行162〜268
- [hooks/use-llm.ts](hooks/use-llm.ts) — 約行216〜256

### 詳細

いずれのファイルでも以下の同一パターンが繰り返されている。

- `ReadableStream` から `TextDecoder` でチャンクを読む
- `\n` で分割し `data:` プレフィックスをチェック
- `JSON.parse` でイベントオブジェクトに変換
- `content` / `thinking` / `toolCall` / `reasoning` の各フィールドを個別に状態へ反映

### 改善方向

共有ユーティリティ（例: `lib/llm/sse-stream.ts`）にジェネレータ関数として抽出し、3箇所から呼び出す形に統一する。

---

## 2. ~~ツール設定の重複定義~~ ✅ 完了

**優先度: 🔴 高 / 難易度: 🟨 低**

### 問題

ツール名とラベル・アイコンのマッピングが以下の2箇所に別々の形式で定義されており、一方を修正しても他方に反映されない。

- [components/ui/StreamingMessage.tsx](components/ui/StreamingMessage.tsx) — `toolIcons` と `toolLabels` を別々に定義（約行65〜89）
- [components/chat/AgenticResponse.tsx](components/chat/AgenticResponse.tsx) — `toolConfig` として1オブジェクトにまとめて定義（約行96〜106）

### 詳細

同じツール（`web_search`, `x_search`, `code_execution` 等）の情報が異なるデータ構造で2重管理されている。新しいツールを追加した場合、両ファイルの修正が必要。

### 改善方向

`lib/tools/config.ts` に一元定義し、両コンポーネントからimportする形に統一する。

---

## 3. `FeatureChat.tsx` の肥大化

**優先度: 🔴 高 / 難易度: ⬛ 高**

### 問題

[components/ui/FeatureChat.tsx](components/ui/FeatureChat.tsx) が約757行に達しており、以下の複数の責務が1ファイルに混在している。

- チャット状態管理（メッセージ、入力値、添付ファイル）
- 思考ステップ（ThinkingStep）の生成ロジック（約行174〜233）
- 会話の保存処理（約行401〜423）
- UIレンダリング

また、`useState` が9個以上宣言されており（約行69〜79）、関連する状態がまとまらずに分散している。

### 改善方向

- 思考ステップ管理を `useThinkingSteps` カスタムフックに抽出
- 会話保存処理を `useConversationSave` カスタムフックに抽出
- 入力エリア・ファイル添付を子コンポーネントへ分割

---

## 4. `useChat.ts` の `handleStream` 関数の肥大化

**優先度: 🔴 高 / 難易度: ⬛ 高**

### 問題

[hooks/useChat.ts](hooks/useChat.ts) の `handleStream` 関数が約287行（行48〜334）に及び、以下の処理が1関数に集中している。

- SSEストリームの読み取り
- ツール呼び出しの状態管理（`toolCallsMap`）
- 思考ステップの逐次更新
- エラーハンドリング
- 完了後の後処理

### 改善方向

ストリーム処理を専用の処理クラスや関数群に分離し、`handleStream` はオーケストレーションのみを担当する形に整理する。

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

[hooks/useResearchChat.ts](hooks/useResearchChat.ts)（約行57〜102）など複数のフックで、`fetch("/api/llm/stream", ...)` が直接呼び出されている。これによりHTTPリクエストとUIロジックが密結合しており、単体テストが困難。

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

## 11. 命名の非一貫性

**優先度: 🟡 低 / 難易度: 🟨 低**

### 問題

コンポーネントのProps型の命名に一貫性がない。

- `AgenticResponseProps` / `StreamingMessageProps` → `コンポーネント名 + Props`
- 一部のコンポーネントではProps型が未定義または匿名

また、featureIdのキー文字列（`"general-chat"` / `generalChat`）がファイルによってケバブケースとキャメルケースで混在している。

### 改善方向

- Propsの型名はすべて `コンポーネント名 + Props` に統一
- featureIdはどちらか一方の形式に統一し、型エイリアスで管理

---

## まとめ・対応ロードマップ

| # | 課題 | 優先度 | 難易度 |
|---|------|--------|--------|
| 1 | SSEストリーム処理の重複 | 🔴 高 | 🟫 中 |
| 2 | ツール設定の重複定義 | 🔴 高 | 🟨 低 |
| 3 | `FeatureChat.tsx` の肥大化 | 🔴 高 | ⬛ 高 |
| 4 | `handleStream` 関数の肥大化 | 🔴 高 | ⬛ 高 |
| 5 | `as unknown` キャストの多用 | 🔴 高 | 🟫 中 |
| 6 | エラーの握りつぶし | 🟠 中 | 🟨 低 |
| 7 | 状態の二重・三重管理 | 🟠 中 | 🟫 中 |
| 8 | `GrokToolSettings` の設計問題 | 🟠 中 | ⬛ 高 |
| 9 | `fetch` の直接呼び出し | 🟠 中 | ⬛ 高 |
| 10 | ハードコードされた定数 | 🟡 低 | 🟨 低 |
| 11 | 命名の非一貫性 | 🟡 低 | 🟨 低 |

### 推奨対応順序

1. **まず着手（高優先度×低難易度）**: #2 ツール設定の重複、#6 エラーの握りつぶし、#10 定数の一元化
2. **次に着手（高優先度×中難易度）**: #1 SSE処理の共通化、#5 キャスト解消
3. **設計と調整が必要（高優先度×高難易度）**: #3 FeatureChat分割、#4 handleStream分割
4. **並行して進められる（中優先度）**: #7 状態集約、#11 命名統一
5. **大きな設計変更（中優先度×高難易度）**: #8 GrokToolSettings再設計、#9 APIクライアント層
