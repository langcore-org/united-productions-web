# 未使用コード詳細調査レポート

> **調査日**: 2026-02-22  
> **対象プロジェクト**: Teddy (AI Hub)  
> **調査範囲**: 全TypeScript/TSXファイル

---

## 📋 概要

本レポートは各ファイルの**具体的な機能**と**なぜ未使用なのか**を詳細に記載したものです。

---

## 🔴 高優先度：削除推奨（確信犯）

### 1. 未使用コンポーネントファイル

#### `components/layout/Header.tsx`
**何をするファイルか**:  
アプリのトップヘッダー。通知機能（ベルアイコン＋未読バッジ）、ユーザーメニュー（アバター＋ドロップダウン）、モバイルメニューボタンを提供。

**具体的な機能**:
- 通知ドロップダウン：未読件数バッジ、通知リスト、既読マーク機能
- ユーザーメニュー：設定、ログアウトリンク
- ダークテーマ（`bg-[#0d0d12]`）のUI

**なぜ未使用か**:  
各ページで独自のヘッダーをインライン実装しているため。例えば `meeting-notes/page.tsx` ではstickyヘッダーをページ内に直接書いている。

**代わりに使われているもの**:  
各ページのインライン実装（`app/(authenticated)/*/page.tsx`）

---

#### `components/layout/SplitPaneLayout.tsx`
**何をするファイルか**:  
左右2ペインのリサイズ可能なレイアウト。ドラッグでパネル幅を調整できる。

**具体的な機能**:
- 左右パネルの表示と比率調整（ドラッグ可能なリサイザー）
- 最小幅の制約（デフォルト300px）
- マウスドラッグによるリアルタイムサイズ変更

**なぜ未使用か**:  
現在のUIデザインでは左右分割レイアウトを採用していない。

**代わりに使われているもの**:  
シングルカラムレイアウト、または各ページの独自レイアウト

---

#### `components/ui/AttachmentMenu.tsx`
**何をするファイルか**:  
ファイル添付用のドロップダウンメニュー。ファイルアップロード、外部サービス連携の入口。

**具体的な機能**:
- ファイルアップロード、テキスト追加、スケッチ描画
- Googleドライブ、OneDrive連携
- 最近使用したファイルのサブメニュー
- ライトテーマ（白背景）のポップアップメニュー

**なぜ未使用か**:  
ファイル添付は別のコンポーネントで実装済み。Googleドライブ連携も別のボタンで実装。

**代わりに使われているもの**:  
- `components/ui/FileUpload.tsx`（ドラッグ＆ドロップ対応）
- `components/meeting-notes/GoogleDriveButtons.tsx`

---

#### `components/meeting-notes/FileUploadChat.tsx`
**何をするファイルか**:  
文字起こしファイル（VTT/TXT/SRT）のアップロードとチャット機能を組み合わせたコンポーネント。

**具体的な機能**:
- ファイルアップロード（VTT、TXT、SRT対応）
- テキスト直接貼り付け
- AI生成中のチャットUI（メッセージバブル、送信フォーム）
- ダークテーマのUI

**なぜ未使用か**:  
議事録機能は `meeting-notes/page.tsx` で別途実装されており、チャットベースのUIではなくシンプルなテキストエリア＋結果表示の構成。

**代わりに使われているもの**:  
`app/(authenticated)/meeting-notes/page.tsx` でインライン実装

---

#### `components/icons/TeddyIcon.tsx`
**何をするファイルか**:  
「Teddy」ブランドのロゴアイコン（クマのキャラクターSVG）。

**具体的な機能**:
- SVGで描画されたクマの顔（耳、目、鼻、口、頬）
- `variant`（default/outline/filled）と`size`のカスタマイズ
- `TeddyLogo`コンポーネントでテキスト付きロゴも提供

**なぜ未使用か**:  
コメントアウトされた状態で `Sidebar.tsx` と `AdminSidebar.tsx` に残っている。「ロゴは非表示（将来使用予定）」のコメントあり。

**代わりに使われているもの**:  
ロゴは使用されていない。サイドバーはアイコン＋テキストのシンプルな構成。

---

#### `components/ui/LLMSelector.tsx`
**何をするファイルか**:  
LLMプロバイダー（AIモデル）を選択するためのドロップダウンセレクター。

**具体的な機能**:
- プロバイダー一覧のカテゴリ別表示（Google、xAI、OpenAI、Anthropic、Perplexity）
- アイコン、無料枠バッジ、推奨バッジ、NEWバッジの表示
- カテゴリーグラデーションによる視覚的区別

**なぜ未使用か**:  
現在のモデル選択は `ModelSelector.tsx` で実装されているが、そちらも実質的に未使用。プロジェクトは `DEFAULT_PROVIDER`（`grok-4-1-fast-reasoning`）を固定使用。

**代わりに使われているもの**:  
`lib/llm/config.ts` の `DEFAULT_PROVIDER` を直接使用

---

#### `components/ui/ModelSelector.tsx`
**何をするファイルか**:  
シンプルなモデル選択ドロップダウン（`LLMSelector`の軽量版）。

**具体的な機能**:
- 主要モデルとその他モデルの2段階表示
- `DropdownMenu`（shadcn/ui）を使用
- 推奨・NEWバッジ表示

**なぜ未使用か**:  
プロジェクトではモデル選択UIを表示していない。`PRIMARY_MODELS`に有効なモデルが1つ（Grok 4.1 Fast）のみ定義され、他はコメントアウト。

**代わりに使われているもの**:  
`DEFAULT_PROVIDER` を直接使用

---

#### `components/ui/ExportButton.tsx`
**何をするファイルか**:  
データをMarkdownまたはCSV形式でエクスポートするボタン。

**具体的な機能**:
- Markdown/CSV形式の選択ドロップダウン
- エクスポート状態の表示（進行中、成功、エラー）
- `SimpleExportButton`（単一形式用）も提供

**なぜ未使用か**:  
エクスポート機能は `WordExportButton.tsx` に統合・置き換えられている。

**代わりに使われているもの**:  
`components/ui/WordExportButton.tsx`（Word/.docx形式）

---

#### `components/ui/FeatureButtons.tsx`
**何をするファイルか**:  
機能ボタン群を一括表示するためのコンポーネント。

**具体的な機能**:
- DeepSearch、Imagine、最新ニュース、ボイスチャット、議事録、起こし・NAなどのプリセットボタン
- ライト/ダークバリアント、サイズバリエーション
- ショートカットキー表示、リンク対応

**なぜ未使用か**:  
これらの機能ボタンは現在のUIでは使用されていない。

**代わりに使われているもの**:  
`components/layout/Sidebar.tsx` のナビゲーションメニュー

---

#### `components/ui/slider.tsx`
**何をするファイルか**:  
shadcn/ui標準のスライダーコンポーネント（Radix UIベース）。

**具体的な機能**:
- 数値範囲の選択（最小値・最大値設定可能）
- 水平/垂直方向対応
- 複数ハンドル（範囲選択）対応

**なぜ未使用か**:  
プロジェクト内でスライダーUIが必要な機能がない。

**代わりに使われているもの**:  
直接使用されている箇所なし

---

#### `components/ui/switch.tsx`
**何をするファイルか**:  
shadcn/ui標準のトグルスイッチコンポーネント（Radix UIベース）。

**具体的な機能**:
- オン/オフの切り替えUI
- サイズバリエーション（sm/default）
- アクセシビリティ対応

**なぜ未使用か**:  
設定画面などで使用される可能性があるが、現在の実装では別のUIが使用されている。

**代わりに使われているもの**:  
`components/ui/checkbox.tsx`、または独自実装のトグル

---

### 2. 未使用APIエンドポイント

#### `/api/llm/langchain` (`app/api/llm/langchain/route.ts`)
**何をするファイルか**:  
LangChainを使用したチャット完了エンドポイント。

**具体的な機能**:
- `POST` メソッドでチャットメッセージを受け取り、AIレスポンスを返す
- リクエスト: `{ messages: Array<{role, content}>, provider?, temperature?, maxTokens? }`
- レスポンス: `{ content: string, usage: {...}, provider: string, requestId: string }`

**なぜ未使用か**:  
`/api/llm/chat` と完全に重複している。フロントエンドからは `/api/llm/chat` が呼び出される。

**代わりに使われているもの**:  
`POST /api/llm/chat`（`hooks/use-llm.ts` から呼び出し）

---

#### `/api/llm/langchain/stream` (`app/api/llm/langchain/stream/route.ts`)
**何をするファイルか**:  
LangChain版のストリーミングAPIエンドポイント。現在はリエクスポートのみ。

**具体的な機能**:
- `/api/llm/stream` への単純なリエクスポート
- 同じパラメータ、同じレスポンス形式

**なぜ未使用か**:  
完全に `/api/llm/stream` と重複。

**代わりに使われているもの**:  
`POST /api/llm/stream`（`hooks/use-llm.ts` などから呼び出し）

---

#### `/api/llm/rag` (`app/api/llm/rag/route.ts`)
**何をするファイルか**:  
Retrieval-Augmented Generation（RAG）エンドポイント。文書検索と質問応答を組み合わせた機能。

**具体的な機能**:
- `POST` メソッドで文書配列と質問を受け取る
- リクエスト: `{ documents: Array<{content, metadata}>, question: string, provider?, topK? }`
- レスポンス: `{ answer: string, sources: number[], requestId: string }`

**なぜ未使用か**:  
フロントエンドから呼び出しがない。RAG機能は実装されているが、UI側で使用されていない。

**代わりに使われているもの**:  
現時点では代替となるエンドポイントはない

---

#### `/api/llm/usage` (`app/api/llm/usage/route.ts`)
**何をするファイルか**:  
フロントエンドからLLM使用量を記録するためのエンドポイント。

**具体的な機能**:
- `POST` メソッドで使用量データを受け取る
- リクエスト: `{ provider: string, inputTokens: number, outputTokens: number, metadata? }`
- レスポンス: `{ success: true }`

**なぜ未使用か**:  
使用量の記録はサーバーサイドで自動的に行われる。フロントエンドから明示的に呼び出す必要がない。

**代わりに使われているもの**:  
サーバーサイドの `trackUsage` 関数

---

### 3. 未使用ユーティリティファイル

#### `lib/env-check.ts`
**何をするファイルか**:  
環境変数の検証とデバッグ情報取得ユーティリティ。

**具体的な機能**:
- `checkAuthEnv()`: 認証関連の環境変数（NEXTAUTH_SECRET等）が設定されているかチェック
- `getEnvDebugInfo()`: デバッグ用に環境変数の状態を返す（機密情報はマスク）

**なぜ未使用か**:  
環境変数の検証はアプリケーション起動時やビルド時に行われ、実行時には不要。

**代わりに使われているもの**:  
なし（削除可能）

---

#### `lib/markdown.ts`
**何をするファイルか**:  
Markdown処理ユーティリティ。

**具体的な機能**:
- `markdownToHtml(markdown)`: MarkdownをHTMLに変換
- `markdownToPlainText(markdown)`: Markdownをプレーンテキストに変換
- `countMarkdownText(markdown)`: Markdownの文字数をカウント
- `truncateMarkdown(markdown, maxLength)`: Markdownを指定文字数で切り詰め

**なぜ未使用か**:  
Markdown処理は `react-markdown` コンポーネントで直接行われている。

**代わりに使われているもの**:  
`react-markdown` ライブラリ

---

#### `lib/parsers/document.ts`
**何をするファイルか**:  
PDF、Word、Excelファイルのパーサー。

**具体的な機能**:
- `parsePDF(buffer)`: PDFファイルをテキストに変換
- `parseWord(buffer)`: Wordファイルをテキストに変換
- `parseExcel(buffer)`: Excelファイルをテキストに変換
- `detectFileType(buffer)`: ファイルタイプを検出
- `generateScheduleExtractionPrompt(text)`: スケジュール抽出用プロンプト生成

**なぜ未使用か**:  
ファイルパースは `lib/upload/file-parser.ts` で行われている。

**代わりに使われているもの**:  
`lib/upload/file-parser.ts`

---

### 4. 未使用スクリプト・プロンプト

#### `scripts/check-prompts.ts`
**何をするファイルか**:  
プロンプトの整合性をチェックするスクリプト。

**具体的な機能**:
- DBに登録されているプロンプトとコード内のプロンプトを比較
- 不一致の検出とレポート

**なぜ未使用か**:  
package.jsonのscriptsに登録されていない。手動実行用。

---

#### `scripts/test-langchain.ts`
**何をするファイルか**:  
LangChain統合のテストスクリプト。

**具体的な機能**:
- LangChainクライアントの動作確認
- ストリーミングレスポンスのテスト

**なぜ未使用か**:  
package.jsonのscriptsに登録されていない。

---

#### `scripts/verify-langchain-migration.sh`
**何をするファイルか**:  
LangChain移行の検証スクリプト。

**具体的な機能**:  
シェルスクリプトで移行状況をチェック

**なぜ未使用か**:  
package.jsonのscriptsに登録されていない。

---

#### `prompts/meeting/default.md`
**何をするファイルか**:  
議事録生成用のデフォルトプロンプト（Markdown形式）。

**具体的な機能**:  
文字起こしテキストから議事録を生成するためのシステムプロンプト

**なぜ未使用か**:  
プロンプトはDB管理に移行済み。

---

#### `prompts/meeting/interview.md`
**何をするファイルか**:  
インタビュー記事生成用プロンプト。

**なぜ未使用か**:  
プロンプトはDB管理に移行済み。

---

#### `prompts/research/*.md` (evidence.md, location.md, people.md)
**何をするファイルか**:  
リサーチ機能用のプロンプト（エビデンス、場所、人物）。

**なぜ未使用か**:  
プロンプトはDB管理に移行済み。

---

#### `prompts/schedule/generate.md`
**何をするファイルか**:  
スケジュール生成用プロンプト。

**なぜ未使用か**:  
ロケスケ機能が削除されたため。

---

#### `prompts/transcript/format.md`
**何をするファイルか**:  
文字起こしフォーマット用プロンプト。

**なぜ未使用か**:  
プロンプトはDB管理に移行済み。

---

### 5. 未使用型定義

#### `types/agent-thinking.ts` の未使用型
**何をする型か**:  
AIエージェントの思考プロセス表示用の型定義。

**具体的な型**:
- `ComputerPanelState`: コンピューターパネルの状態管理
- `ThinkingProcessState`: 思考プロセス全体の状態
- `ThinkingComponentProps`: 思考コンポーネントのProps

**なぜ未使用か**:  
コンポーネントでは別の型定義を使用している。

---

#### `types/export.ts` の未使用型
**何をする型か**:  
エクスポート機能の型定義。

**具体的な型**:
- `WordExportResponse`: WordエクスポートAPIのレスポンス型

**なぜ未使用か**:  
APIレスポンスは直接 `NextResponse` で返しているため。

---

#### `types/upload.ts` の未使用型
**何をする型か**:  
ファイルアップロード機能の型定義。

**具体的な型**:
- `FileValidationError`: ファイル検証エラー（`ParseError` と重複）
- `FileUploadRequest`: アップロードリクエスト型
- `FileUploadResponse`: アップロードレスポンス型
- `SupportedFileType`: サポートされるファイルタイプ

**なぜ未使用か**:  
別の型定義やインライン型を使用している。

---

### 6. 未使用Prismaモデル

#### `LocationSchedule`
**何をするモデルか**:  
ロケーションスケジュール（ロケスケ）管理用のDBモデル。

**具体的なフィールド**:
- `id`: プライマリキー
- `userId`: 作成ユーザーID
- `title`: スケジュールタイトル
- `content`: スケジュール内容
- `createdAt`, `updatedAt`: タイムスタンプ

**なぜ未使用か**:  
ロケスケ機能が削除されたため。コードから一切参照されていない。

---

## 🟡 中優先度：統合・リファクタリング推奨

### 1. 機能重複

#### 議事録機能の重複
**問題の詳細**:
```
【実装A】app/(authenticated)/meeting-notes/page.tsx
- 640行の独立した実装
- ファイルアップロード、テキスト入力、AI生成、結果表示を1ファイルで管理
- 独自のステート管理、スタイリング

【実装B】/chat?gem=minutes
- ChatPageコンポーネントを使用
- 統合チャットUI
- サイドバーから直接アクセス可能
```

**なぜ重複しているか**:  
統合チャット機能（ChatPage）を後から導入したが、既存のmeeting-notesページを統合・移行しなかった。

**推奨対応**:  
meeting-notesページを `/chat?gem=minutes` にリダイレクト、または統合チャットに機能を完全移行

---

#### NA原稿機能の重複
**問題の詳細**:
```
【実装A】app/(authenticated)/transcripts/page.tsx
- 582行の独立した実装
- VTTファイルのアップロード、NA原稿生成

【実装B】/chat?gem=na-script
- ChatPageコンポーネントを使用
- 統合チャットUI
```

**なぜ重複しているか**:  
議事録機能と同様。

**推奨対応**:  
transcriptsページを `/chat?gem=na-script` にリダイレクト

---

#### リサーチ機能の重複
**問題の詳細**:
```
【実装A】/research (app/(authenticated)/research/page.tsx)
- ResearchChatコンポーネントを使用
- 独立したページ

【実装B】/chat?gem=research-*
- ChatPageコンポーネントを使用
- 統合チャットUI
- Sidebarから直接遷移
```

**なぜ重複しているか**:  
ResearchChatは独立したリサーチ機能として実装されたが、後に統合チャットにもリサーチ機能が追加された。

**推奨対応**:  
統合検討。Sidebarからは `/chat?gem=research-*` へ直接遷移しているため、`/research` ページは孤立している。

---

### 2. レイアウト重複

**問題の詳細**:
```
【親レイアウト】app/(authenticated)/layout.tsx
- AppLayoutをラップ
- 認証チェック、共通レイアウト

【子レイアウト】
- app/(authenticated)/meeting-notes/layout.tsx
- app/(authenticated)/research/layout.tsx
- app/(authenticated)/transcripts/layout.tsx

これらの子レイアウトはすべて親と同じ内容（AppLayoutラップのみ）
```

**なぜ重複しているか**:  
各機能を独立して実装した際に、それぞれにlayout.tsxを作成したが、内容が同じになった。

**推奨対応**:  
子レイアウトを削除し、親レイアウトのみ使用

---

### 3. 関数・定数の重複

#### `getProviderDisplayName` の重複
**重複箇所**:
- `lib/llm/factory.ts`
- `lib/llm/utils.ts`

**何をする関数か**:  
プロバイダーID（例: "grok-4-1-fast-reasoning"）を人間可読な名前（例: "Grok 4.1 Fast"）に変換する。

**推奨対応**:  
`utils.ts` の方を残し、`factory.ts` の方を削除

---

#### `simpleTextSplit` の重複
**重複箇所**:
- `lib/llm/langchain/rag/index.ts`
- `lib/llm/langchain/rag/simple.ts`

**何をする関数か**:  
テキストを指定されたチャンクサイズで分割する（RAG用）。

**推奨対応**:  
`simple.ts` を削除し、`index.ts` のみ残す

---

#### `MAX_FILE_SIZE` の重複
**重複箇所**:
- `types/upload.ts`: `10 * 1024 * 1024` (10MB)
- `lib/upload/file-parser.ts`: `10 * 1024 * 1024` (10MB)
- `components/ui/FileUpload.tsx`: ローカル定義

**推奨対応**:  
`config/constants.ts` から一元管理

---

### 4. 未使用エクスポート（将来使用予定がない場合は削除）

#### `lib/api/auth.ts` の未使用関数

**`optionalAuth(req)`**:
- **何をするか**: オプショナル認証。セッションがあれば返し、なければnullを返す。
- **なぜ未使用か**: すべてのAPIエンドポイントが認証必須となっており、オプショナル認証が必要なユースケースが存在しない。

**`requireRole(req, allowedRoles)`**:
- **何をするか**: 特定のロールを持つユーザーのみ許可。
- **なぜ未使用か**: ロールベースの詳細な権限制御が必要な機能がまだ実装されていない。現在は `requireAdmin` で代用。

---

#### `lib/api/utils.ts` の未使用関数

**`successResponse(data, status)`**:
- **何をするか**: 成功レスポンスを作成（`NextResponse.json({ success: true, data })`）
- **なぜ未使用か**: 各API Routeで直接記述されているため

**`validateProvider(provider, validProviders)`**:
- **何をするか**: プロバイダー文字列を検証
- **なぜ未使用か**: Zodスキーマでバリデーションされているため

**`parseBody(req)`**:
- **何をするか**: リクエストボディを安全にパース
- **なぜ未使用か**: `createApiHandler` 内で直接 `request.json()` が呼ばれているため

---

#### `lib/api/handler.ts` の未使用関数

**`createStreamingResponse(generator)`**:
- **何をするか**: AsyncIterable<string> を受け取り、SSE形式のレスポンスを返す
- **なぜ未使用か**: `app/api/llm/stream/route.ts` に似た機能の関数が個別に実装されており、そちらが使用されている

---

#### `lib/llm/factory.ts` の未使用関数

**`getProviderDisplayName(provider)`**:
- **何をするか**: プロバイダーの表示名を取得
- **なぜ未使用か**: `utils.ts` に同名の関数があり、そちらが使用されている

**`getSameVendorProviders(provider)`**:
- **何をするか**: 同じベンダーのプロバイダーを取得（フェイルオーバー用）
- **なぜ未使用か**: フェイルオーバー機能が実装されていない

---

#### `lib/llm/utils.ts` の未使用関数

**`hasSearchCapability(provider)`**:
- **何をするか**: プロバイダーが検索機能を持つか判定
- **なぜ未使用か**: 検索機能の有無で処理を分岐していない

---

#### `lib/llm/cache.ts` の未使用関数（全て）

**何をするファイルか**:  
LLMレスポンスをRedisにキャッシュする機能群。

**具体的な関数**:
- `generateCacheKey`: キャッシュキー生成
- `cacheLLMResponse`: レスポンスをキャッシュに保存
- `getCachedLLMResponse`: キャッシュからレスポンス取得
- `invalidateLLMCache`: キャッシュ無効化
- `clearLLMCache`: キャッシュクリア
- `getCacheStats`: キャッシュ統計取得
- `getCachedResponse`/`setCachedResponse`/`clearCache`: シンプル版インターフェース

**なぜ未使用か**:  
キャッシュ機能が現在有効化されていない。

---

#### `lib/llm/config.ts` の未使用定数

**`RATE_LIMITS`**:
- **何をするか**: レート制限設定（リクエスト/分、リクエスト/日）
- **なぜ未使用か**: レート制限機能が有効化されていない

**`UPSTASH_FREE_TIER`**:
- **何をするか**: Upstash Redis無料枠設定
- **なぜ未使用か**: キャッシュ機能が有効化されていない

**`CACHE_CONFIG`**:
- **何をするか**: キャッシュ設定（TTL、キープレフィックス）
- **なぜ未使用か**: キャッシュ機能が有効化されていない

---

#### `lib/llm/langchain/` 以下の未使用エクスポート

**`lib/llm/langchain/agents/index.ts`**:
- `executeWithTools`: ツールを使用してエージェントを実行
- `executeWithDefaultTools`: デフォルトツールでエージェントを実行
- **なぜ未使用か**: エージェント機能が現在使用されていない

**`lib/llm/langchain/memory/index.ts`**:
- `createChatMemory`: チャットメモリ作成
- `createMemoryFromMessages`: メッセージからメモリ作成
- `executeWithMemory`: メモリ付きで実行
- `clearMemory`: メモリクリア
- `getMemoryMessages`: メモリからメッセージ取得
- **なぜ未使用か**: メモリ機能が現在使用されていない

**`lib/llm/langchain/prompts/templates.ts`**:
- `basicChatPrompt`: 基本チャットプロンプト
- `structuredOutputPrompt`: 構造化出力プロンプト
- `meetingSummaryPrompt`: 議事録要約プロンプト
- `minutesGenerationPrompt`: 議事録生成プロンプト
- `researchAssistantPrompt`: リサーチアシスタントプロンプト
- `createCustomPrompt`: カスタムプロンプト作成
- `createFewShotPrompt`: Few-shotプロンプト作成
- **なぜ未使用か**: プロンプトはDB管理に移行済み

**`lib/llm/langchain/tools/index.ts`**:
- `calculatorTool`: 電卓ツール
- `currentTimeTool`: 現在時刻ツール
- `wordCountTool`: 文字数カウントツール
- `searchTool`: 検索ツール
- `getToolByName`: ツール名で取得
- `createCustomTool`: カスタムツール作成
- **なぜ未使用か**: ツール機能が現在使用されていない

**`lib/llm/langchain/rag/simple.ts`**:
- `simpleTextSplit`: テキスト分割
- `executeSimpleRAG`: シンプルRAG実行
- **なぜ未使用か**: RAG機能が現在使用されていない

---

#### `lib/google/drive.ts` の未使用関数

**`listFilesInFolder(folderId, options)`**:
- **何をするか**: 特定フォルダ内のファイル一覧取得
- **なぜ未使用か**: 現在の機能ではフォルダ内一覧が不要

**`searchFilesByName(fileName, options)`**:
- **何をするか**: ファイル名で検索（部分一致）
- **なぜ未使用か**: 検索機能が現在使用されていない

**`searchFilesByMimeType(mimeType, options)`**:
- **何をするか**: MIMEタイプでファイル検索
- **なぜ未使用か**: タイプ別検索が不要

**`getImagePreviewUrl(fileId, size)`**:
- **何をするか**: 画像ファイルのプレビューURL取得
- **なぜ未使用か**: 画像プレビュー機能がない

**`exportFile(fileId, mimeType)`**:
- **何をするか**: ファイルをエクスポート（Google Workspaceドキュメント等）
- **なぜ未使用か**: エクスポート機能がない

**`getGoogleDocAsText(fileId)`**:
- **何をするか**: Googleドキュメントをプレーンテキストで取得
- **なぜ未使用か**: Googleドキュメントの読み込み機能がない

**`getGoogleDocAsMarkdown(fileId)`**:
- **何をするか**: GoogleドキュメントをMarkdownで取得
- **なぜ未使用か**: 同上

**`getGoogleSheetAsCsv(fileId)`**:
- **何をするか**: GoogleスプレッドシートをCSVで取得
- **なぜ未使用か**: スプレッドシート読み込み機能がない

**`getFileDownloadUrl(fileId)`**:
- **何をするか**: ファイルのダウンロードURL取得
- **なぜ未使用か**: ダウンロード機能がない

**`DriveSearchQueries`**:
- **何をするか**: よく使用する検索クエリのプリセット
- **なぜ未使用か**: 検索機能がない

**`MimeTypes`**:
- **何をするか**: よく使用するMIMEタイプの定数
- **なぜ未使用か**: クライアント側で独自の定義を使用

---

#### `lib/chat/gems.ts` の未使用関数

**何をするファイルか**:  
GeminiのGemと同様に、特定の用途に特化したチャット機能（Gem）を定義。

**具体的な関数**:
- `getGemsByCategory(category)`: カテゴリ別のGem一覧
- `getResearchGems()`: リサーチ系のGem
- `getDocumentGems()`: ドキュメント系のGem
- `getGeneralGems()`: 一般系のGem

**なぜ未使用か**:  
「Gem」という用語から「Agent」という用語に移行した際に `lib/chat/agents.ts` が作成された。こちらは後方互換性用だが、実際には `agents.ts` が使用されている。

**代わりに使われているもの**:  
`lib/chat/agents.ts` の同名関数

---

#### `lib/chat/chat-config.ts` の未使用関数

**何をするファイルか**:  
チャット機能の一元管理設定を提供。

**具体的な関数**:
- `getAllChatFeatures()`: 全機能のリスト
- `getResearchFeatures()`: リサーチ機能のリスト
- `requiresDynamicPrompt(featureId)`: 動的プロンプトが必要かチェック
- `isValidFeatureId(id)`: 機能IDが有効かチェック

**なぜ未使用か**:  
`lib/chat/agents.ts` と内容が重複しており、命名体系も「Agent」に統一された結果、こちらは使用されなくなった。

**代わりに使われているもの**:  
`lib/chat/agents.ts` の同名関数

---

#### `lib/settings/db.ts` の未使用関数

**`getSystemSetting(key)`**:
- **何をするか**: システム設定値をDBから取得
- **なぜ未使用か**: 現在は使用していない設定

**`setSystemSetting(key, value)`**:
- **何をするか**: システム設定値をDBに保存
- **なぜ未使用か**: 同上

**`deleteSystemSetting(key)`**:
- **何をするか**: システム設定をDBから削除
- **なぜ未使用か**: 同上

**`isToolEnabled(toolId)`**:
- **何をするか**: ツールが有効かチェック
- **なぜ未使用か**: ツール機能が現在使用されていない

**`isGrokToolEnabled(toolId)`**:
- **何をするか**: Grokツールが有効かチェック
- **なぜ未使用か**: Grokツール設定は別の方法で管理

---

#### `lib/settings/types.ts` の未使用関数

**`groupSettingsByCategory(settings)`**:
- **何をするか**: 設定をカテゴリ別にグループ化
- **なぜ未使用か**: クライアント側で別の方法でグループ化

**`validateSetting(setting, value)`**:
- **何をするか**: 設定値のバリデーション
- **なぜ未使用か**: Zodスキーマでバリデーション

---

#### `lib/export/index.ts` の未使用関数

**`convertConversationToMarkdown(messages)`**:
- **何をするか**: 会話をMarkdown形式に変換
- **なぜ未使用か**: Markdownエクスポート機能がない

**`convertConversationToCSV(messages)`**:
- **何をするか**: 会話をCSV形式に変換
- **なぜ未使用か**: CSVエクスポート機能がない

---

#### `lib/logger/index.ts` の未使用関数

**`logError(error, context)`**:
- **何をするか**: エラーをログに記録
- **なぜ未使用か**: エラーログ機能が有効化されていない

**`logApiCall(apiName, params, duration)`**:
- **何をするか**: API呼び出しをログに記録
- **なぜ未使用か**: APIログ機能が有効化されていない

**`logAuth(event, userId)`**:
- **何をするか**: 認証イベントをログに記録
- **なぜ未使用か**: 認証ログ機能が有効化されていない

---

#### `lib/parsers/vtt.ts` の未使用関数

**`formatTime(seconds)`**:
- **何をするか**: 秒数をVTT形式の時間（HH:MM:SS.mmm）に変換
- **なぜ未使用か**: 時間フォーマットが不要

**`cuesToConversation(cues)`**:
- **何をするか**: VTTキューを会話形式に変換
- **なぜ未使用か**: 別の方法で変換

**`groupBySpeaker(cues)`**:
- **何をするか**: 話者別にキューをグループ化
- **なぜ未使用か**: グループ化機能が不要

---

#### `lib/xss-sanitizer.ts` の未使用関数

**`sanitizeText(text)`**:
- **何をするか**: テキストをXSS対策でサニタイズ
- **なぜ未使用か**: DOMPurifyを直接使用

**`sanitizeUrl(url)`**:
- **何をするか**: URLをXSS対策でサニタイズ
- **なぜ未使用か**: URLサニタイズが不要

---

#### `lib/usage/tracker.ts` の未使用関数

**`extractTokenUsage(response)`**:
- **何をするか**: レスポンスからトークン使用量を抽出
- **なぜ未使用か**: 使用量は別の方法で追跡

---

#### `lib/admin-styles.ts` の未使用関数

**`getProviderBadgeStyle(provider)`**:
- **何をするか**: プロバイダー別のバッジスタイルを取得
- **なぜ未使用か**: バッジスタイルが不要

**`getStatBadgeStyle(type)`**:
- **何をするか**: 統計タイプ別のバッジスタイルを取得
- **なぜ未使用か**: 同上

---

## 🟢 低優先度：改善検討

### 1. テスト関連

#### `tests/e2e/smoke.spec.ts`
**何をするファイルか**:  
E2Eスモークテスト。基本機能の動作確認。

**具体的な内容**:
- トップページのアクセス確認
- ログインページの表示確認
- チャットページの動作確認

**問題点**:  
すべてのテストが `.skip` で無効化されている。

**推奨対応**:  
有効化または削除

---

#### `tests/integration/` と `tests/unit/`
**何をするディレクトリか**:  
統合テストとユニットテスト用のディレクトリ。

**問題点**:  
空ディレクトリ。

**推奨対応**:  
削除

---

### 2. 実装不十分なページ

#### `app/page.tsx`（ダッシュボード）
**何をするファイルか**:  
アプリのトップページ（ダッシュボード）。

**具体的な機能**:
- 各機能へのクイックアクセスカード
- チャット入力欄（装飾のみ）

**問題点**:  
チャット入力欄が装飾のみ。`handleSend` で `console.log` のみ。

**推奨対応**:  
実際のチャット送信機能を実装するか、入力欄を削除してシンプルなダッシュボードに変更

---

#### `app/langchain-test/page.tsx`
**何をするファイルか**:  
LangChain統合のテストページ。

**具体的な機能**:
- LangChainChatコンポーネントの表示
- ストリーミングレスポンスのテスト

**問題点**:  
開発用ページ。本番環境では不要。

**推奨対応**:  
`/admin` 配下に移動または削除

---

### 3. 未使用だが将来使用予定ありそう

#### `lib/llm/langchain/` 以下
**何をするディレクトリか**:  
LangChain統合の基盤。エージェント、メモリ、ツール、RAGなどの機能。

**将来の使用予定**:  
LangChain統合の拡張時に使用される可能性あり。

**推奨対応**:  
現状維持（将来的に使用される可能性）

---

#### `lib/cache/redis.ts`
**何をするファイルか**:  
Redisキャッシュの基盤。

**将来の使用予定**:  
キャッシュ機能有効化時に使用。

**推奨対応**:  
現状維持

---

#### `lib/research/prompts.ts`
**何をするファイルか**:  
リサーチエージェント用のプロンプト。

**将来の使用予定**:  
リサーチ機能拡張時に使用。

**推奨対応**:  
現状維持

---

## 📊 統計サマリー

| カテゴリ | 件数 | 備考 |
|---------|------|------|
| 未使用コンポーネントファイル | 12 | 削除推奨 |
| 未使用APIエンドポイント | 4 | 削除推奨 |
| 未使用ユーティリティファイル | 3 | 削除推奨 |
| 未使用スクリプト | 3 | 削除推奨 |
| 未使用プロンプトファイル | 7 | 削除推奨 |
| 未使用型定義 | 8 | 削除推奨 |
| 未使用Prismaモデル | 1 | 削除推奨 |
| 未使用エクスポート（関数・定数） | 80+ | 削除検討 |
| 重複機能 | 10+ | 統合検討 |

---

## 📝 対応優先度まとめ

### 即座に削除可能（影響なし）
1. `components/layout/Header.tsx` - 未使用ヘッダー
2. `components/layout/SplitPaneLayout.tsx` - 未使用レイアウト
3. `components/ui/AttachmentMenu.tsx` - 未使用メニュー
4. `components/meeting-notes/FileUploadChat.tsx` - 未使用チャット
5. `components/icons/TeddyIcon.tsx` - 未使用アイコン
6. `components/ui/LLMSelector.tsx` - 未使用セレクター
7. `components/ui/ModelSelector.tsx` - 未使用セレクター
8. `components/ui/ExportButton.tsx` - 未使用エクスポート
9. `components/ui/FeatureButtons.tsx` - 未使用ボタン群
10. `components/ui/slider.tsx` - 未使用UI
11. `components/ui/switch.tsx` - 未使用UI
12. `app/api/llm/langchain/route.ts` - 重複API
13. `app/api/llm/langchain/stream/route.ts` - 重複API
14. `app/api/llm/rag/route.ts` - 未使用API
15. `app/api/llm/usage/route.ts` - 未使用API
16. `lib/env-check.ts` - 未使用ユーティリティ
17. `lib/markdown.ts` - 未使用ユーティリティ
18. `lib/parsers/document.ts` - 未使用パーサー
19. `scripts/check-prompts.ts` - 未使用スクリプト
20. `scripts/test-langchain.ts` - 未使用スクリプト
21. `scripts/verify-langchain-migration.sh` - 未使用スクリプト
22. `prompts/**/*.md` - 未使用プロンプト
23. `types/` の未使用型定義

### 統合後に削除（影響確認必要）
1. `app/(authenticated)/meeting-notes/page.tsx` → `/chat?gem=minutes` 統合
2. `app/(authenticated)/transcripts/page.tsx` → `/chat?gem=na-script` 統合
3. `app/(authenticated)/*/layout.tsx` → 親layout統合
4. `lib/llm/factory.ts` の未使用関数 → 統合
5. `lib/llm/langchain/rag/simple.ts` → index.ts 統合

### 検討が必要
1. `lib/llm/langchain/` 以下 - 将来使用予定あり
2. `lib/llm/cache.ts` - キャッシュ機能の有無
3. `lib/google/drive.ts` の未使用関数 - 使用開始または削除
4. `lib/chat/gems.ts` - agents.ts との統合
5. `lib/chat/chat-config.ts` - agents.ts との統合

---

## 🔗 関連ドキュメント

- `docs/specs/system-architecture.md` - システム構成
- `docs/specs/api-specification.md` - API仕様
- `docs/specs/database-schema.md` - DBスキーマ

---

*最終更新: 2026-02-22*
