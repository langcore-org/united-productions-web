# 技術設計レビュー - AI Hub統合プラットフォーム

**レビュー日**: 2026-02-15
**対象**: AI Hub統合プラットフォーム

> **✅ 反映状況**: 2026-02-15 確認済み - 全項目が関連ドキュメントに反映済み
> - `initial_dev_plan.md` - 全項目反映済み（Transcriptモデル・UsageLogモデル含む）
> - `llm-integration.md` - LLM統合設計反映済み
> - `phase-1-core.md`, `phase-2-features.md` - フェーズ計画反映済み
> - `agent-06-grok-api.md` → `agent-06-llm-integration.md`（複数LLM対応に改名推奨）- 反映済み
> - `agent-10-pj-a.md`, `agent-11-pj-b.md`, `agent-12-pj-d.md` - 各PJ仕様反映済み

---

## 総合評価

| 項目 | 評価 | 理由 |
|------|------|------|
| 技術スタック | A | Next.js 14 + Prisma + NextAuth.js、実績豊富 |
| アーキテクチャ | A | シンプルで理解しやすい（PJ-B仕様変更で更に簡素化） |
| データモデル | B | 基本設計はあるが、ENUM化・インデックス等の詳細定義が不足 |
| セキュリティ | A | 認証基盤は堅実、API Key管理に改善余地あり |
| 実装計画 | A | フェーズ分けと並列実行戦略が明確 |
| コスト | S | **Google AI Studio無料枠活用で月額 $0〜1 で運用可能** |

---

## Next.js vs Vite + React

**結論: Next.js 14（App Router）が最適**

Next.jsを選択する理由:

- **バックエンド不要**: API Routesで複数LLM APIキーをサーバーサイドで安全に管理
- **ストリーミング標準サポート**: RSC対応、Grok/GPT/Claudeのリアルタイム応答に最適
- **NextAuth.js統合**: Google Workspace SSOが数行で実装可能
- **Vercel最適化**: デプロイが1コマンド、スケーリング自動

Vite + Reactの場合、認証・API管理・ストリーミングの全てに別途バックエンド構築が必要となり、開発・運用コストが大幅に増加する。ビルド速度・HMR速度ではViteが優位だが、このプロジェクトではNext.jsのメリットが圧倒的。

---

## LLMモデル選定（2026年2月最新）

### 料金表

| LLM | 入力（$/1M tokens） | 出力（$/1M tokens） | 特徴 |
|-----|-------------------|-------------------|------|
| **Gemini 2.5 Flash-Lite** | $0.075 | $0.30 | 最安値、定型処理に最適 |
| **Gemini 3.0 Flash** | $0.50 | $3.00 | 高品質、複雑なタスク向け |
| **Gemini 2.5 Flash** | $0.10 | $0.40 | 2026年6月廃止予定 |
| **Grok 4.1 Fast** | $0.20 | $0.50 | 2Mコンテキスト、X Search $2.50-5/1K calls |
| **Grok 4** | $3.00 | $15.00 | 高性能、高コスト |
| **GPT-4o-mini** | $0.15 | $0.60 | コスパ良、軽量タスク向け |
| **GPT-4o** | $2.50 | $10.00 | 高品質 |
| **GPT-5** | $1.25 | $10.00 | 400Kコンテキスト |
| **Claude 4.5 Sonnet** | $3.00 | $15.00 | 200Kコンテキスト |
| **Claude Opus 4.6** | $5.00 | $25.00 | 2026/2/4リリース、前世代から67%削減 |
| **Perplexity Sonar** | $1.00/1M input | - | 引用トークン無料、エビデンス向け |

### プロジェクト別推奨LLM

| プロジェクト | 推奨LLM | 理由 |
|------------|---------|------|
| PJ-A（議事録整形） | Gemini 2.5 Flash-Lite | 最安値、定型処理 |
| PJ-B（書き起こし整形） | Gemini 2.5 Flash-Lite | 最安値、テキスト貼り付け方式 |
| PJ-C（リサーチ・人探し） | Grok 4.1 Fast + Perplexity Sonar | X検索 + エビデンス付き回答 |
| PJ-D（ロケスケ叩き台） | Gemini 2.5 Flash-Lite | 最安値、定型処理 |

---

## Google AI Studio 無料枠（初期運用戦略）

### 無料で使えるモデル

| モデル | レート制限 | 日次制限 | 費用 |
|--------|----------|---------|------|
| **Gemini 2.5 Flash-Lite** | 30 RPM | 1,500 RPD | **$0** |
| **Gemini 3.0 Flash Preview** | 30 RPM | 1,500 RPD | **$0** |

### その他の無料クレジット

- **xAI**: 新規登録で **$25無料クレジット**（Grok 4.1 Fast等で利用可能）

### 初期運用の方針

PJ-A/B/DはGoogle AI Studio無料枠内のGeminiで処理し、PJ-CのみGrok/Perplexityの従量課金（またはxAI無料クレジット）を使用する。これにより初期段階では**ほぼ無料**で運用可能。

---

## 改善が必要な点

### 1. データベース設計の詳細化

**問題点**: `agentType`がENUM化されていない、`ResearchMessage`モデル定義が不完全、インデックスが未定義。

**推奨対応**:
- `AgentType`, `MessageRole`, `LLMProvider` をEnum化
- `ResearchChat`に`llmProvider`フィールド追加（コスト分析・性能比較用）
- `Transcript`モデルの簡素化（映像URL削除、speakers削除）→ テキスト貼り付け方式に対応
- `UsageLog`モデル追加（コスト追跡用）
- 適切なインデックス設計（`@@index([userId, createdAt])`等）
- `onDelete: Cascade` 設定

### 2. 複数LLM統合アーキテクチャ

**方針**: Factory パターンによる統一インターフェース設計

- `src/lib/llm/types.ts`: `LLMClient`インターフェース定義（`chat()`, `stream()`）
- `src/lib/llm/factory.ts`: `createLLMClient(provider)` でプロバイダー切り替え
- 各LLMクライアント実装（`grok.ts`, `openai.ts`, `anthropic.ts`, `gemini.ts`, `perplexity.ts`）
- 使用量（トークン数・コスト）をDBに自動記録

### 3. APIレート制限・エラーハンドリング

**問題点**: 複数LLM APIにそれぞれ異なるレート制限があり、ストリーミング中断時のハンドリングが未定義。

**推奨対応**:
- Upstash Redisによるプロバイダー別レート制限（`@upstash/ratelimit`）
- ストリーミング中断時の再試行ロジック
- APIエラー時のフォールバック（LLM自動切り替え）

### 4. PJ-B: テキスト貼り付け方式（仕様変更済み）

旧仕様（映像アップロード + Whisper API + 話者分離）から大幅に簡素化済み。

**現在の仕様**:
1. ユーザーがPremiere Proから書き起こしテキストをコピー
2. Webアプリのテキストエリアに貼り付け
3. LLM（Gemini 2.5 Flash-Lite）で整形（話者ラベル統一、フォーマット調整）
4. 画面表示またはWord形式でダウンロード

Whisper API、話者分離、ファイルストレージは全て不要。

### 5. ファイルアップロード（PJ-Aのみ）

PJ-Aで音声ファイルを扱う場合はCloudflare R2（無料枠: 10GB/月）を使用。PJ-Aもテキスト貼り付け方式に統一すれば、ファイルストレージ自体が不要になる。

---

## コスト最適化

### インフラコスト（全て無料枠）

| サービス | プラン | 月額 | 備考 |
|---------|-------|------|------|
| Vercel | Hobby | $0 | 100GB帯域幅/月 |
| Neon PostgreSQL | Free | $0 | 0.5GBストレージ |
| Upstash Redis | Free | $0 | 10,000コマンド/日 |
| Google Drive API | 無料 | $0 | 2万リクエスト/日 |
| NextAuth.js | OSS | $0 | - |
| Cloudflare R2 | Free | $0 | 10GB/月（PJ-A用、廃止可能） |

### LLM APIコスト

| プロジェクト | 推奨構成 | 月額コスト |
|------------|---------|----------|
| PJ-A（議事録整形） | Gemini 2.5 Flash-Lite（無料枠） | **$0** |
| PJ-B（書き起こし整形） | Gemini 2.5 Flash-Lite（無料枠） | **$0** |
| PJ-C（リサーチ） | Grok 4.1 Fast + Perplexity Sonar | **$0〜1** |
| PJ-D（ロケスケ叩き台） | Gemini 2.5 Flash-Lite（無料枠） | **$0** |
| **合計** | | **$0〜1/月（初期）** |

フル活用時（全プロジェクト稼働、有料API積極利用）: **$3〜5/月**

### コスト削減のポイント

- **LLM選択の最適化**: 定型処理はGemini 2.5 Flash-Lite（GPT-4oの約1/33）、エビデンス検索はPerplexity、X検索はGrok
- **APIレスポンスのキャッシュ**: Upstash Redisで同一プロンプトのキャッシュ（24時間TTL）
- **段階的な機能追加**: Phase 1でPJ-C（リサーチ）のみ実装し、順次拡大
- **使用量モニタリング**: `UsageLog`モデルで月次レポート自動生成

---

## 総評

### 強み
- 実装計画が具体的で、フェーズ分け・担当エージェント・成果物が明確
- PJ-B仕様変更（テキスト貼り付け方式）により複雑性・コストが大幅に減少
- Google AI Studio無料枠の活用で、初期運用コストがほぼゼロ

### 要対応事項
- Prismaスキーマの詳細化（ENUM化、インデックス、`UsageLog`モデル）
- 複数LLM統合のFactory パターン実装
- PJ-Aの入力方式の検討（テキスト貼り付けに統一すればインフラ更に簡素化）

### 結論

Google AI Studio無料枠 + Grok/Perplexity従量課金の構成により、**月額 $0〜1 で初期運用が可能**。フル活用でも $3〜5/月に収まる。技術スタック・アーキテクチャは堅実で、Phase 0を開始する準備が整っている。
