## [2026-02-16 01:32] [INIT]
PJ-C リサーチ・考査機能実装を開始

## 作業内容
- app/research/page.tsx - メインページ
- app/research/layout.tsx - レイアウト
- app/api/research/route.ts - APIエンドポイント
- components/research/ 以下にコンポーネント

## 機能仕様
### 人探しエージェント
- LLM: Grok 4.1 Fast（X Search対応）
- 出力: 候補リスト（30人程度、表形式）
- エクスポート: CSV, Markdown

### エビデンス確認エージェント
- LLM: Perplexity Sonar
- 出力: 回答 + エビデンスURL一覧

### ロケ地探しエージェント
- LLM: Perplexity Sonar
- Drive連携: 過去ロケ地資料を横断検索（将来実装）

## UI仕様（Grok UI風）
- 背景: #0d0d12
- カード: #1a1a24
- アクセント: #ff6b00
- エージェント切り替え: タブ（人探し / ロケ地 / エビデンス）
- LLM選択: エージェント別に最適なLLMをデフォルト設定
- チャットUI: メッセージバブル形式

