> **優先度**: 🟡 中
> **状態**: 検討中 → 一部実装済み
> **最終更新**: 2026-03-20 15:50
> **関連**: 現在はシンプルな `research-cast` 機能として実装済み（xAI直接API使用、LangChainは将来の拡張用に保持）

## 重要: 実装状況の更新（2026-03-20）

| 項目 | 元の計画 | 現在の実装 |
|------|---------|-----------|
| **実行環境** | LangGraph Cloud | **xAI直接API呼び出し** |
| **ワークフロー** | LangGraph State遷移 | **シンプルなxAI呼び出し** |
| **保存先** | LangGraph Cloud | **Supabase Database** |

**技術スタック変更の理由**:
- LangGraphは複雑性が高く、メリットが限定的
- xAI直接APIで十分な機能を実現可能
- Supabase Auth/DBとの統合が容易

# SNS人物探索エージェント仕様書

## 質問リスト（回答済み）

| No | 項目 | 確定内容 |
|----|------|---------|
| Q1 | 表示形式の理由 | AIエージェントの進捗を直感的に把握 |
| Q2 | 詳細調査レベル | **スタンダード** |
| Q3 | タイムアウト時間 | **60秒** |
| Q4 | 実行環境 | **LangGraph Cloud（無料枠で開始）** |
| Q5 | APIキー管理 | **システム持ち** |
| Q6 | 候補者上限 | **20人→10人→5人** |
| Q7 | 実行回数上限 | **10回/日（無料）/ 無制限（有料）** |
| Q8 | 探索履歴の保存 | **する** |
| Q9 | 保存期間 | **無制限（技術的限界まで）** |
| Q10 | 個人情報の取り扱い | **保存するが第三者提供はしない** |

---

## 1. ワークフロー詳細

### 1.1 LangGraph State遷移図

```
[Idle] 
  ↓ ユーザー入力
[ParseIntent] - 意図解析（カテゴリ・条件抽出）
  ↓
[DiscoverCandidates] - 候補者発見（YouTube検索）
  ↓
[FilterBasic] - 基本フィルタ（登録者数等）
  ↓
[CheckQuality] - 品質チェック
  ↓ スコア < 閾値 && リトライ < 3
[RetryDiscovery] - 再検索（キーワード拡張）
  ↓
[SelectForDetail] - 詳細調査対象選定（上位10人）
  ↓
[CollectDetailed] - 詳細情報収集（SNS + Web）
  ↓
[ScoreCandidates] - 多軸スコアリング
  ↓
[HumanReview] - 人間介入（候補者選択）
  ↓ ユーザー入力待ち（60秒タイムアウト）
[FinalizeRanking] - 最終ランキング確定（5人）
  ↓
[GenerateReport] - レポート生成
  ↓
[Complete]
```

### 1.2 各ステップの入出力

#### ParseIntent（意図解析）

**入力**:
- ユーザーテキスト（例: 「片付けの専門家でYouTube人気、関東圏の人」）

**処理**:
- xAI Grokでカテゴリ・条件を抽出
- 評価軸・重みを提案

**出力**:
```
{
  category: "片付け・整理収納",
  platforms: ["youtube"],
  requirements: {
    region: "関東",
    minFollowers: null, // 未指定
    mediaExperience: "preferred" // 優遇
  },
  scoringAxes: [
    { name: "人気度", weight: 30 },
    { name: "専門性", weight: 25 },
    { name: "実績", weight: 25 },
    { name: "地域適合", weight: 20 }
  ]
}
```

#### DiscoverCandidates（候補者発見）

**入力**:
- カテゴリ、キーワード、プラットフォーム

**処理**:
- YouTube Data APIでチャンネル検索
- 関連キーワードで複数回検索

**出力**:
```
{
  candidates: [
    {
      id: "uuid",
      platform: "youtube",
      externalId: "UCxxx",
      name: "鈴木一郎",
      handle: "@suzuki_tidy",
      followers: 250000,
      profileUrl: "https://...",
      discoveredAt: "2026-02-20T10:00:00Z"
    }
  ],
  totalFound: 20
}
```

#### CheckQuality（品質チェック）

**入力**:
- 候補者リスト

**処理**:
- データ数チェック（最低5件）
- 必須フィールドの有無
- 重複チェック

**出力**:
```
{
  qualityScore: 75, // 0-100
  issues: ["データ数やや不足（8件）"],
  shouldRetry: true,
  retryStrategy: "キーワード拡張"
}
```

#### CollectDetailed（詳細情報収集）

**入力**:
- 選定された候補者ID（最大10人）

**処理**:
- YouTube: チャンネル詳細、最近動画10本
- Web検索: Wikipedia、ニュース、公式サイト
- エンゲージメント計算

**出力**:
```
{
  detailedProfiles: [
    {
      candidateId: "uuid",
      youtube: {
        subscriberCount: 250000,
        videoCount: 150,
        recentVideos: [...],
        averageViews: 120000,
        engagementRate: 4.8
      },
      webInfo: {
        wikipedia: { ... },
        news: [...],
        officialSite: { ... }
      }
    }
  ]
}
```

#### ScoreCandidates（スコアリング）

**入力**:
- 詳細プロフィール
- 評価軸・重み

**処理**:
- 各軸のスコア計算（0-100）
- 加重平均で総合スコア算出

**出力**:
```
{
  scores: {
    popularity: 95,
    expertise: 85,
    achievements: 90,
    regionMatch: 100,
    total: 92
  },
  breakdown: "人気度: 登録者25万・急成長..."
}
```

#### HumanReview（人間介入）

**入力**:
- スコア付き候補者リスト（10人）

**処理**:
- UIに候補者表示
- ユーザー選択待ち

**出力**:
```
{
  selectedCandidates: ["uuid1", "uuid2", "uuid3"],
  selectionMode: "auto", // or "manual"
  userFeedback: null // またはユーザー入力
}
```

#### GenerateReport（レポート生成）

**入力**:
- 最終選定候補者（5人）
- 詳細プロフィール・スコア

**処理**:
- xAI Grokで要約・コメント生成
- 比較表作成
- Markdown形式で整形

**出力**:
```
{
  report: {
    title: "番組出演者候補レポート",
    category: "片付け・整理収納",
    generatedAt: "2026-02-20T10:30:00Z",
    candidates: [...],
    comparisonTable: "...",
    agentComment: "..."
  }
}
```

### 1.3 エラーハンドリングフロー

| エラー種別 | 発生ステップ | 対応 | フォールバック |
|-----------|------------|------|--------------|
| APIレート制限 | DiscoverCandidates | 指数バックオフでリトライ（最大3回） | キーワード変更して再検索 |
| API認証エラー | DiscoverCandidates | 即座にエラー通知 | 管理者に通知、手動対応待ち |
| データ0件 | DiscoverCandidates | キーワード拡張して再検索（最大3回） | ユーザーに条件緩和を提案 |
| 品質チェック不合格 | CheckQuality | 自動リトライ（最大3回） | 強制続行 or エラー終了（ユーザー選択） |
| Web検索失敗 | CollectDetailed | ログ記録、続行 | SNSデータのみで評価続行 |
| スコアリング失敗 | ScoreCandidates | デフォルト値で続行 | エラー終了 |
| 人間介入タイムアウト | HumanReview | 自動選択（上位3人） | - |
| レポート生成失敗 | GenerateReport | テンプレートで簡易レポート | エラー終了 |

---

## 2. データモデル詳細

### 2.1 ER図

```
[ResearchSession] 1 --- * [Candidate]
    │                    │
    │                    ├── 1 --- * [CandidatePlatform]
    │                    │
    │                    └── 1 --- * [CandidateScore]
    │
    └── 1 --- * [ResearchLog]
```

### 2.2 テーブル定義

#### research_sessions（探索セッション）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| user_id | UUID | ユーザーID（FK） |
| category | VARCHAR(100) | 探索カテゴリ |
| requirements | JSONB | 条件（地域、フォロワー数等） |
| scoring_axes | JSONB | 評価軸・重み |
| status | VARCHAR(20) | 状態（running, completed, failed） |
| started_at | TIMESTAMP | 開始時刻 |
| completed_at | TIMESTAMP | 完了時刻 |
| final_report | JSONB | 最終レポート |
| created_at | TIMESTAMP | 作成時刻 |

#### candidates（候補者）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| session_id | UUID | FK（research_sessions） |
| name | VARCHAR(100) | 名前 |
| handle | VARCHAR(100) | SNSハンドル |
| region | VARCHAR(50) | 地域 |
| is_selected | BOOLEAN | ユーザー選択有無 |
| final_rank | INTEGER | 最終ランキング |
| created_at | TIMESTAMP | 作成時刻 |

#### candidate_platforms（プラットフォーム別情報）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| candidate_id | UUID | FK（candidates） |
| platform | VARCHAR(20) | youtube, x, instagram, tiktok |
| external_id | VARCHAR(100) | プラットフォーム固有ID |
| follower_count | INTEGER | フォロワー/登録者数 |
| content_count | INTEGER | 投稿/動画数 |
| recent_content | JSONB | 最近の投稿（最大10件） |
| engagement_rate | DECIMAL(5,2) | エンゲージメント率 |
| profile_data | JSONB | その他プロフィール情報 |
| fetched_at | TIMESTAMP | 取得時刻 |

#### candidate_scores（スコア詳細）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| candidate_id | UUID | FK（candidates） |
| axis_name | VARCHAR(50) | 評価軸名 |
| score | INTEGER | スコア（0-100） |
| weight | INTEGER | 重み（%） |
| breakdown | TEXT | 内訳説明 |
| created_at | TIMESTAMP | 作成時刻 |

#### research_logs（実行ログ）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| session_id | UUID | FK（research_sessions） |
| step | VARCHAR(50) | ステップ名 |
| status | VARCHAR(20) | running, completed, failed |
| message | TEXT | ログメッセージ |
| metadata | JSONB | 追加情報 |
| created_at | TIMESTAMP | 作成時刻 |

### 2.3 インデックス設計

```sql
-- 検索用インデックス
CREATE INDEX idx_candidates_session ON candidates(session_id);
CREATE INDEX idx_candidates_rank ON candidates(session_id, final_rank);
CREATE INDEX idx_platforms_candidate ON candidate_platforms(candidate_id);
CREATE INDEX idx_platforms_type ON candidate_platforms(platform);
CREATE INDEX idx_scores_candidate ON candidate_scores(candidate_id);
CREATE INDEX idx_logs_session ON research_logs(session_id, created_at);

-- JSONB検索用（必要に応じて）
CREATE INDEX idx_sessions_requirements ON research_sessions USING GIN (requirements);
CREATE INDEX idx_platforms_data ON candidate_platforms USING GIN (profile_data);
```

---

## 3. API連携詳細

### 3.1 YouTube Data API

#### 使用エンドポイント

| 目的 | エンドポイント | クォータ消費 |
|------|--------------|-------------|
| チャンネル検索 | `search.list` | 100ユニット |
| チャンネル詳細 | `channels.list` | 1ユニット |
| チャンネル動画 | `playlistItems.list` | 1ユニット |
| 動画詳細 | `videos.list` | 1ユニット |

#### レート制限対策

- 1日クォータ: 10,000ユニット
- 1回の探索で消費見積もり:
  - 検索（3回）: 300ユニット
  - チャンネル詳細（20件）: 20ユニット
  - 動画取得（10件×10チャンネル）: 100ユニット
  - **合計: 約420ユニット/探索**
- 1日最大探索数: **約23回**

#### リトライ戦略

```
1回目失敗 → 2秒待機 → リトライ
2回目失敗 → 4秒待機 → リトライ
3回目失敗 → 8秒待機 → リトライ
4回目失敗 → エラー終了
```

### 3.2 Web検索（xAI Grok使用）

#### 検索対象

- Wikipedia（経歴確認）
- ニュース記事（メディア出演実績）
- 公式サイト（詳細プロフィール）
- 出版情報（著書）

#### 活用方法

- xAI GrokのWeb Searchツールを使用
- 候補者名 + キーワードで検索
- 信頼性の高いソースを優先

---

## 4. UI/UX詳細

### 4.1 チャット画面コンポーネント

#### メッセージバブル種別

| 種別 | 用途 | 表示例 |
|------|------|--------|
| user | ユーザー入力 | 通常の吹き出し（右寄せ） |
| agent | エージェント応答 | 通常の吹き出し（左寄せ） |
| progress | 進捗表示 | 区切り線 + 絵文字 + テキスト |
| candidate | 候補者カード | 構造化された情報カード |
| selection | 選択UI | ボタン or チェックボックス |
| report | レポート | Markdownレンダリング |

#### リアルタイム更新の仕組み

- LangGraph CloudのStreaming APIを使用
- Server-Sent Events (SSE) でクライアントにプッシュ
- ステップ開始時に即時反映

### 4.2 レポート表示画面

#### レイアウト

```
┌─────────────────────────────────────┐
│  📊 番組出演者候補レポート           │
│  カテゴリ: 片付け・整理収納          │
├─────────────────────────────────────┤
│                                     │
│  🥇 第1推奨: 鈴木一郎（92/100）     │
│  ┌─────────────────────────────┐   │
│  │ [プロフィールカード]         │   │
│  │ - 基本情報                   │   │
│  │ - SNS指標                    │   │
│  │ - 実績・経歴                 │   │
│  │ - 評価詳細                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  📋 比較表                          │
│  ┌────────┬────────┬────────┐     │
│  │ 項目   │鈴木    │山田    │     │
│  ├────────┼────────┼────────┤     │
│  │ ...    │ ...    │ ...    │     │
│  └────────┴────────┴────────┘     │
│                                     │
│  [編集ボタン] [ダウンロード]        │
│                                     │
└─────────────────────────────────────┘
```

#### 編集機能

- インライン編集（クリックで修正）
- コメント追加（各候補者にメモ）
- スコア手動調整
- 候補者の追加/削除

---

## 5. エラーハンドリング詳細

### 5.1 エラー分類

| レベル | 説明 | 例 |
|--------|------|-----|
| **致命的** | 続行不可能 | APIキー無効、DB接続失敗 |
| **回復可能** | リトライで解決 | レート制限、一時的エラー |
| **軽微** | スキップで続行 | 一部データ欠損、Web検索失敗 |
| **警告** | 注意喚起のみ | データ鮮度低下、推定値使用 |

### 5.2 リトライ戦略詳細

| 対象 | 最大リトライ | 間隔 | 条件 |
|------|------------|------|------|
| YouTube API | 3回 | 指数バックオフ（2,4,8秒） | レート制限、タイムアウト |
| Web検索 | 2回 | 固定5秒 | タイムアウト |
| 品質チェック | 3回 | 即時 | スコア未達 |

### 5.3 フォールバック処理

| 失敗対象 | フォールバック |
|---------|--------------|
| YouTube API | キーワード変更 → エラー終了 |
| Web検索（Wikipedia） | スキップ（SNSデータのみ使用） |
| Web検索（ニュース） | スキップ |
| スコアリング（一部軸） | 該当軸を除外して再計算 |
| レポート生成 | 簡易テンプレートで出力 |

---

## 6. セキュリティ詳細

### 6.1 APIキー管理

#### 保存方法

- 環境変数またはシークレット管理サービス
- データベースには保存しない
- ローテーション: 3ヶ月ごと

#### アクセス制御

- サーバーサイドのみ使用
- クライアントに露出しない
- ログにマスクして出力

### 6.2 個人情報の取り扱い

#### 収集データ

| データ | 分類 | 取り扱い |
|--------|------|---------|
| SNS公開プロフィール | 公開情報 | 探索履歴として保存 |
| 氏名 | 個人情報 | 保存するが暗号化 |
| 連絡先（メール等） | 個人情報 | 取得しない（ユーザー責任） |
| 位置情報 | 個人情報 | 都道府県レベルまで保存 |

#### 利用規約での明記事項

- 収集するデータの範囲
- 保存期間（無制限）
- 第三者提供の有無（しない）
- ユーザー自身の責任範囲

### 6.3 アクセス制御

| 機能 | 未ログイン | 一般ユーザー | 管理者 |
|------|----------|------------|--------|
| 探索実行 | × | ○（制限あり） | ○ |
| 履歴閲覧 | × | 自分のみ | 全員 |
| APIキー設定 | × | × | ○ |
| システム設定 | × | × | ○ |

---

## 7. 実装フェーズ

### Phase 1: MVP（2-3週間）

- [ ] LangGraph Cloudセットアップ
- [ ] YouTube API連携（検索・詳細取得）
- [ ] 基本ワークフロー（発見→評価→レポート）
- [ ] シンプルなチャットUI
- [ ] PostgreSQL連携

### Phase 2: 機能拡張（2週間）

- [ ] Web検索連携（xAI Grok）
- [ ] 人間介入機能
- [ ] レポート編集機能
- [ ] エラーハンドリング強化

### Phase 3: 高度化（2週間）

- [ ] 複数プラットフォーム対応（代替ツール）
- [ ] 履歴管理・比較機能
- [ ] UI/UX改善
- [ ] パフォーマンス最適化

---

## 8. 更新履歴

| 日付 | 内容 | 担当 |
|------|------|------|
| 2026-02-20 | 初版作成 | AI |
| 2026-02-20 | 人物探索モードに特化して改訂 | AI |
| 2026-02-20 | 詳細化（ワークフロー、データモデル、API、UI、セキュリティ） | AI |
| 2026-03-20 | 技術スタック更新（xAI直接API、Supabase認証） | AI |

---

## 関連ドキュメント

- [Backlog README](./README.md) - Backlog管理ガイド
- [AGENTS.md](../../AGENTS.md) - エージェント行動指針
- [LLM統合仕様](../../docs/specs/api-integration/llm-integration-overview.md) - LLM統合の詳細

---

**最終更新**: 2026-03-20 14:35

---

*ステータス: 詳細仕様確定*
