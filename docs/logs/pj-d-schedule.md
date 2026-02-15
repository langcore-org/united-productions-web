## [2026-02-16 01:32] [INIT]
PJ-D ロケスケ管理機能実装を開始

### 作業内容
- app/schedules/page.tsx - メインページ
- app/schedules/layout.tsx - レイアウト
- app/api/schedules/route.ts - APIエンドポイント
- prompts/schedule-generate.ts - プロンプト

### 機能仕様
- マスター: ロケスケジュール全体版（編集可能）
- 自動生成: 演者別スケジュール、香盤表（スタッフ動き）、車両表
- LLM: Gemini 2.5 Flash-Lite
- エクスポート: Markdown, CSV

### UI仕様（Grok UI風）
- 背景: #0d0d12
- カード: #1a1a24
- アクセント: #ff6b00
