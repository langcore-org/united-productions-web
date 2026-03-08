# LLMストリーミング実装ログ

## 概要

Server-Sent Events (SSE) を使用したLLMストリーミングレスポンスの実装。
リアルタイムでの文字表示と思考プロセス表示に対応。

## 実装内容

### 1. クライアント側実装（lib/llm/clients/）

#### gemini.ts
- `stream()` メソッド: Google Generative AIの `generateContentStream` を使用
- 非同期イテレータでチャンクを逐次返却
- エラーハンドリング実装

#### grok.ts
- `stream()` メソッド: xAI APIのストリーミング対応
- SSE形式のレスポンスを解析
- `data: ` プレフィックスの処理と `[DONE]` 検出

#### perplexity.ts
- `stream()` メソッド: Perplexity APIのストリーミング対応
- citations（ソースURL）の収集と最終出力への追加

### 2. APIエンドポイント（app/api/llm/stream/route.ts）

- POST `/api/llm/stream`
- SSE形式でストリーミングレスポンスを返却
- リクエストバリデーション（Zod）
- エラー時もSSE形式でエラーを返却

#### SSE形式
```
data: {"content": "Hello"}
data: {"content": " world"}
data: [DONE]
```

### 3. UIコンポーネント

#### components/ui/StreamingMessage.tsx
- ストリーミングメッセージ表示コンポーネント
- タイピング効果（文字ごとに表示）
- 思考プロセス表示（Claude/Grok対応）
- `useLLMStream` フック: SSE接続管理

#### components/research/ResearchChat.tsx
- ストリーミング対応のリサーチチャット
- リアルタイムメッセージ更新
- 生成停止機能（AbortController）
- 思考プロセス表示対応

### 4. ページ実装

#### app/meeting-notes/page.tsx
- 議事録整形のストリーミング対応
- リアルタイムプレビュー表示
- 生成停止ボタン

#### app/transcripts/page.tsx
- NA原稿整形のストリーミング対応
- リアルタイムプレビュー表示
- 生成停止ボタン

## 技術仕様

### SSE (Server-Sent Events)
- Content-Type: `text/event-stream`
- Cache-Control: `no-cache`
- Connection: `keep-alive`

### ストリーミングフロー
1. クライアントがPOSTリクエストを送信
2. サーバーがSSEレスポンスを開始
3. LLMクライアントがストリーミングレスポンスを取得
4. チャンクを逐次クライアントに送信
5. `[DONE]` でストリーム終了

### エラーハンドリング
- 接続エラー: SSE形式でエラーメッセージを送信
- パースエラー: 無視して継続
- キャンセル: AbortControllerで対応

## 対応プロバイダー

| プロバイダー | ストリーミング | 思考プロセス |
|------------|--------------|------------|
| Gemini 2.5 Flash-Lite | ✅ | - |
| Gemini 3.0 Flash | ✅ | - |
| Grok 4.1 Fast | ✅ | ✅ |
| Grok 4 | ✅ | ✅ |
| Perplexity Sonar | ✅ | - |
| Perplexity Sonar Pro | ✅ | - |

## コミット履歴

- `[STREAM] ストリーミングメッセージコンポーネント実装`
- `[STREAM] ResearchChatストリーミング対応`
- `[STREAM] 議事録ページストリーミング対応`
- `[STREAM] 起こし・NA原稿ページストリーミング対応`

## 今後の改善案

1. **思考プロセスの詳細表示**
   - Claudeのextended thinking対応
   - 思考時間の表示

2. **パフォーマンス最適化**
   - チャンクのバッファリング
   - レンダリング最適化

3. **機能拡張**
   - ストリーミング中の一時停止
   - 再生速度調整
   - 音声読み上げとの連携
