# UPエージェント - Agent Swarm開発プラン（改訂版 v3）

> **本ドキュメントは、Agent Swarmによる「UPエージェント」（PJ-A/B/C/D統合）アプリの実装プランです。**
> **2026年2月16日改訂: Wave 1/2完了、Wave 3進行中**

---

## 📊 現在の開発状況

### ✅ Wave 1: 基盤構築（完了）
- [x] ui-research → Grok UI分析完了
- [x] database-schema → Prismaスキーマ完成
- [x] auth-api → NextAuth.js + Google Workspace SSO動作
- [x] llm-factory → 複数LLM統合基盤完成

### ✅ Wave 2: UI/LLM連携（完了）
- [x] design-system → shadcn/ui + カスタムテーマ適用
- [x] llm-gemini → Gemini 2.5 Flash-Lite動作確認
- [x] llm-grok → Grok 4.1 Fast動作確認
- [x] llm-perplexity → Perplexity Sonar動作確認

### 🔄 Wave 3: 機能実装（進行中）
- [x] pj-a-meeting → 議事録機能（実装中）
- [x] pj-b-transcript → 書き起こし機能（実装中）
- [x] pj-c-research → リサーチ機能（実装中）
- [ ] pj-d-schedule → ロケスケ機能（未開始）
- [ ] google-drive → Drive連携（未開始）

### ⏳ Wave 4: 統合・最適化（未開始）
- [ ] optimization → キャッシュ実装
- [ ] testing → E2Eテスト

---

## 🚀 Agent Swarm 開発について

本プロジェクトは**複数エージェントを並列起動**して効率的に開発を進めます。

**必ず先に読むこと:**
- 📘 **[Agent Swarm 並列開発ガイド](./agent-swarm-guide.md)** - エージェントの役割、並列実行計画、ベストプラクティス
- 📋 **[ログ仕様](../logs/README.md)** - エージェント間通信の記録方法

**基本方針:**
- 「依存関係が解決できれば即座に開始」
- 「並列で最大限進めて早く完成させる」
- 「必要に応じてエージェントを統合・分割」

---

---

## 🔄 重要な仕様変更

| 項目 | 旧仕様 | 新仕様 |
|------|-------|-------|
| **PJ-B 入力** | 映像ファイルアップロード + Whisper API | Premiere Pro テキスト貼り付け + LLM整形 |
| **LLM API** | Grok のみ | Grok, GPT, Claude, Gemini, Perplexity（複数対応） |
| **LLM初期運用** | 有料API前提 | **Google AI Studio 無料枠**から開始 |
| **ファイルストレージ** | 必須（Vercel Blob / S3） | オプション（PJ-Aのみ、Cloudflare R2推奨） |
| **話者分離** | pyannote.audio / AssemblyAI | 不要 |
| **月額コスト** | $5-10 | **$0（無料枠）〜$3** |

---

## 🎯 プロジェクト概要

### アプリ名称
**AI Hub** - United Productions 制作支援統合プラットフォーム

### 統合する機能（全PJ）

| メニュー | PJ | 対象業務 | 主要機能 | デフォルトLLM |
|---------|-----|---------|---------|-------------|
| 📝 議事録・文字起こし | A | No.6 | Zoom文字起こしテキスト貼り付け→AI整形 | Gemini 2.5 Flash-Lite |
| 🎬 起こし・NA原稿 | B | No.14 | Premiere Pro書き起こしテキスト→決まったフォーマットに整形 | Gemini 2.5 Flash-Lite |
| 🔍 リサーチ・考査 | C | No.1・2・20 | LLM連携で人探し/ロケ地/エビデンス | Grok 4.1 Fast / Perplexity Sonar |
| 📅 ロケスケ管理 | D | No.9 | マスター編集→各種表自動生成 | Gemini 2.5 Flash-Lite |

### 技術スタック（確定）

| 層 | 技術 |
|---|------|
| フロント | Next.js 14 App Router + React + TypeScript + Tailwind CSS |
| UI | shadcn/ui（Grok UIカスタマイズ）|
| バック | Next.js API Routes（Vercel Serverless）|
| DB | Neon PostgreSQL Free Tier（0.5GB） + Prisma |
| 認証 | NextAuth.js（Google Workspace SSO）|
| キャッシュ | Upstash Redis Free Tier（レート制限用）|

---

## 🤖 LLMモデル選定（2026年2月時点 最新）

### 利用可能モデル一覧

| プロバイダー | モデル | 入力 ($/1M tokens) | 出力 ($/1M tokens) | コンテキスト | 用途 |
|------------|--------|-------------------|-------------------|------------|------|
| **Google** | **Gemini 2.5 Flash-Lite** | $0.075 | $0.30 | 1M | ✅ **デフォルト（最安値）** |
| Google | Gemini 2.5 Flash | $0.10 | $0.40 | 1M | ※2026年6月廃止予定 |
| Google | **Gemini 3.0 Flash** | $0.50 | $3.00 | 1M | 高品質タスク |
| **xAI** | **Grok 4.1 Fast** | $0.20 | $0.50 | 2M | ✅ **X検索（PJ-C）** |
| xAI | Grok 3 Mini | $0.30 | $0.50 | - | 軽量タスク |
| xAI | Grok 4 | $3.00 | $15.00 | 2M | 最高品質 |
| **OpenAI** | GPT-4o-mini | $0.15 | $0.60 | 128K | コスパ良 |
| OpenAI | GPT-4o | $2.50 | $10.00 | 128K | 高品質 |
| OpenAI | **GPT-5** | $1.25 | $10.00 | 400K | 最新フラッグシップ |
| OpenAI | GPT-5.2 | - | - | 400K | フラッグシップ（コーディング） |
| **Anthropic** | **Claude 4.5 Sonnet** | $3.00 | $15.00 | 200K | バランス型 |
| Anthropic | **Claude Opus 4.6** | $5.00 | $25.00 | 200K+| 最高品質（2/4リリース） |
| **Perplexity** | **Sonar** | $1.00 | - | - | ✅ **エビデンス付き検索** |
| Perplexity | Sonar Pro | - | - | - | 高品質検索 |

### 🆓 Google AI Studio 無料枠（初期運用）

**最初はGoogle AI Studioから取得したGemini APIの無料枠を使用します。**
無料枠を超えた場合は従量課金に移行します。

| モデル | 無料枠のレート制限 | 備考 |
|--------|------------------|------|
| **Gemini 2.5 Flash-Lite** | 30 RPM / 1,500 RPD | ✅ PJ-A/B/D に十分 |
| **Gemini 3.0 Flash Preview** | 30 RPM / 1,500 RPD | 高品質タスク用 |
| Gemini 2.5 Pro | 10 RPM / 50 RPD | 必要時のみ |

**RPM** = Requests Per Minute / **RPD** = Requests Per Day

**無料枠で十分なケース**:
- 月10件の議事録整形（PJ-A） → 10 RPD → ✅ 余裕
- 月50件の書き起こし整形（PJ-B） → 50 RPD → ✅ 余裕（1,500 RPD）
- 月5件のロケスケ生成（PJ-D） → 5 RPD → ✅ 余裕

### 推奨LLM構成（コスト最適化）

| 用途 | デフォルトLLM | 理由 | コスト |
|------|-------------|------|-------|
| **PJ-A（議事録整形）** | Gemini 2.5 Flash-Lite | 無料枠 + 最安値 | **$0**（無料枠内） |
| **PJ-B（書き起こし整形）** | Gemini 2.5 Flash-Lite | 無料枠 + 最安値 | **$0**（無料枠内） |
| **PJ-C 人探し** | Grok 4.1 Fast | X検索対応 | $0.20/1M tokens |
| **PJ-C エビデンス** | Perplexity Sonar | ソース付き回答 | $1.00/1M tokens |
| **PJ-D（ロケスケ）** | Gemini 2.5 Flash-Lite | 無料枠 + 最安値 | **$0**（無料枠内） |
| **高品質タスク** | Gemini 3.0 Flash | 無料枠（30 RPM） | **$0**（無料枠内） |
| **最高品質（必要時）** | Claude Opus 4.6 | 最高性能 | $5/$25 per 1M |

### Grok API 追加費用（PJ-C）

| ツール | 料金 |
|--------|------|
| X Search | $2.50-5/1,000 calls |
| Web Search | $2.50-5/1,000 calls |
| Code Execution | $2.50-5/1,000 calls |

**xAI 新規登録特典**: $25 無料クレジット + データ共有プログラムで $150/月追加可能

---

## 📁 フォルダ構成（確定版）

```
/home/koyomaru/agent1/
├── docs/
│   ├── assets/
│   │   ├── images/                # Grok UI参考画像
│   │   ├── excels_and_words/      # 参考資料（リサーチ、議事録等）
│   │   └── videos/                # 動画（.gitignore）
│   ├── technical-review.md        # 技術設計レビュー
│   ├── llm-integration.md         # 複数LLM統合設計
│   └── old_discussions/           # 過去の議論・旧プラン
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── llm/               # 複数LLM統合API
│   │   │   │   ├── chat/route.ts
│   │   │   │   └── stream/route.ts
│   │   │   ├── meeting-notes/     # PJ-A
│   │   │   ├── transcripts/       # PJ-B
│   │   │   ├── research/          # PJ-C
│   │   │   └── schedules/         # PJ-D
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                    # shadcn/ui
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── llm/
│   │   │   └── LLMSelector.tsx
│   │   ├── meeting-notes/         # PJ-A
│   │   ├── transcripts/           # PJ-B
│   │   ├── research/              # PJ-C
│   │   └── location-schedule/     # PJ-D
│   ├── hooks/
│   ├── lib/
│   │   ├── llm/                   # 複数LLM統合
│   │   │   ├── types.ts
│   │   │   ├── factory.ts
│   │   │   ├── clients/
│   │   │   │   ├── gemini.ts      # Google AI Studio
│   │   │   │   ├── grok.ts
│   │   │   │   ├── openai.ts
│   │   │   │   ├── anthropic.ts
│   │   │   │   └── perplexity.ts
│   │   │   └── cache.ts
│   │   ├── google/                # Drive連携
│   │   └── prisma.ts
│   ├── prompts/
│   │   ├── meeting-format.ts      # PJ-A
│   │   ├── transcript-format.ts   # PJ-B
│   │   └── schedule-generate.ts   # PJ-D
│   └── types/
├── tests/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env.template
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

---

## 🎨 UI/UX要件（Grok UI参考）

### カラーパレット

| 用途 | HEX | Tailwind |
|------|-----|----------|
| 背景（メイン） | #0d0d12 | bg-[#0d0d12] |
| 背景（カード） | #1a1a24 | bg-[#1a1a24] |
| ボーダー | #2a2a35 | border-[#2a2a35] |
| アクセント | #ff6b00 | text-[#ff6b00] |
| 思考中表示 | #22c55e | text-green-500 |
| ユーザーメッセージ | #3b82f6 | bg-blue-600 |

### コンポーネント仕様

```typescript
interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isThinking?: boolean;
  thinkingContent?: string;
  timestamp: Date;
  llmProvider?: LLMProvider;
}

interface LLMSelectorProps {
  value: LLMProvider;
  onChange: (provider: LLMProvider) => void;
  supportedProviders: LLMProvider[];
  recommendedProvider?: LLMProvider;
}
```

---

## 🔧 機能要件詳細

### PJ-A: 議事録・文字起こし

```typescript
interface MeetingNoteFeature {
  input: 'Zoom文字起こしテキスト（貼り付け）';
  templates: ['会議用', '面談用'];
  aiFormat: {
    meeting: ['議題', '発言要旨', '決定事項', 'TODO'];
    interview: ['人物名', '経歴', '話した内容', '出演可否'];
  };
  llm: 'Gemini 2.5 Flash-Lite';  // Google AI Studio無料枠
  export: ['Markdown', 'コピー'];
}
```

### PJ-B: 起こし・NA原稿（大幅簡素化）

```typescript
interface TranscriptFeature {
  input: 'Premiere Pro 書き起こしテキスト（貼り付け）';
  processing: {
    format: 'LLMで決まったフォーマットに整形';
    speakerLabels: ['櫻井', '末澤', 'N', 'その他'];
    cleanup: '不要な空白・改行削除';
  };
  llm: 'Gemini 2.5 Flash-Lite';  // Google AI Studio無料枠
  output: {
    format: 'Markdown表示 → コピー';
    future: 'Word出力（将来実装）';
  };
}
```

- ❌ ~~映像ファイルアップロード~~ / ~~Whisper API~~ / ~~話者分離~~
- ✅ テキスト貼り付け → LLM整形のみ

### PJ-C: リサーチ・考査（⭐最優先）

```typescript
interface ResearchFeature {
  agents: {
    people: {
      name: '人探し';
      description: '専門家候補をSNS/Web/社内ドライブから検索';
      llm: 'Grok 4.1 Fast（X Search対応）';
      output: '候補リスト（30人程度、表形式）';
      export: ['CSV', 'Markdown'];
    };
    location: {
      name: 'ロケ地探し';
      description: '過去ロケ地資料を横断検索';
      llm: 'Perplexity Sonar（エビデンス付き）';
    };
    evidence: {
      name: 'エビデンス確認';
      description: 'Perplexityでソース付き回答';
      llm: 'Perplexity Sonar';
      output: '回答+エビデンスURL一覧';
    };
  };
  llmSelection: true;  // ユーザーがLLMを切り替え可能
  driveIntegration: true;
}
```

### PJ-D: ロケスケ管理

```typescript
interface ScheduleFeature {
  master: 'ロケスケジュール全体版（編集可能）';
  autoGenerate: {
    actorView: '演者別スケジュール';
    staffView: '香盤表（スタッフ動き）';
    vehicleView: '車両表';
  };
  import: 'Word/PDFから叩き台生成（Gemini API）';
  llm: 'Gemini 2.5 Flash-Lite';  // Google AI Studio無料枠
  export: ['Markdown', 'CSV'];
}
```

---

## 🔐 認証・セキュリティ

### Google Workspace SSO

```typescript
providers: [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorization: {
      params: {
        scope: [
          'openid', 'email', 'profile',
          'https://www.googleapis.com/auth/drive.readonly'
        ].join(' ')
      }
    }
  })
]
```

### 環境変数一覧

```bash
# ===== 必須 =====
# 認証
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=                      # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# データベース（Neon Free Tier）
DATABASE_URL=postgresql://...

# キャッシュ・レート制限（Upstash Free Tier）
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# LLM API
# Google AI Studio（無料枠から開始）
GEMINI_API_KEY=                       # https://aistudio.google.com/ から取得

# ===== 有料API（必要に応じて追加） =====
XAI_API_KEY=                          # Grok 4.1 Fast（PJ-C X検索用、$25無料クレジット付き）
PERPLEXITY_API_KEY=                   # Perplexity Sonar（PJ-C エビデンス用）
OPENAI_API_KEY=                       # GPT-5 / GPT-4o-mini
ANTHROPIC_API_KEY=                    # Claude Opus 4.6 / Sonnet 4.5
```

---

## 📊 データモデル（Prisma）

```prisma
enum LLMProvider {
  GEMINI_25_FLASH_LITE    // デフォルト（無料枠）
  GEMINI_30_FLASH         // 高品質（無料枠）
  GROK_41_FAST            // X検索
  GROK_4                  // 最高品質
  GPT_4O_MINI             // コスパ
  GPT_5                   // フラッグシップ
  CLAUDE_SONNET_45        // バランス
  CLAUDE_OPUS_46          // 最高品質
  PERPLEXITY_SONAR        // エビデンス検索
  PERPLEXITY_SONAR_PRO    // 高品質検索
}

model User {
  id          String    @id @default(uuid())
  email       String    @unique
  name        String?
  googleId    String    @unique
  meetingNotes MeetingNote[]
  transcripts  Transcript[]
  researchChats ResearchChat[]
  schedules    LocationSchedule[]
  usageLogs    UsageLog[]
}

model MeetingNote {
  id            String      @id @default(uuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  type          String      // MEETING | INTERVIEW
  rawText       String      @db.Text
  formattedText String?     @db.Text
  llmProvider   LLMProvider @default(GEMINI_25_FLASH_LITE)
  status        String      // DRAFT | FORMATTING | COMPLETED
  createdAt     DateTime    @default(now())
  @@index([userId, createdAt])
}

model Transcript {
  id            String      @id @default(uuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  rawText       String      @db.Text
  formattedText String?     @db.Text
  llmProvider   LLMProvider @default(GEMINI_25_FLASH_LITE)
  createdAt     DateTime    @default(now())
  @@index([userId, createdAt])
}

model ResearchChat {
  id          String      @id @default(uuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  agentType   String      // PEOPLE | LOCATION | EVIDENCE
  llmProvider LLMProvider @default(GROK_41_FAST)
  messages    ResearchMessage[]
  results     Json?
  createdAt   DateTime    @default(now())
  @@index([userId, createdAt])
  @@index([agentType])
}

model ResearchMessage {
  id        String       @id @default(uuid())
  chatId    String
  chat      ResearchChat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  role      String       // USER | ASSISTANT | SYSTEM
  content   String       @db.Text
  thinking  String?      @db.Text
  createdAt DateTime     @default(now())
  @@index([chatId, createdAt])
}

model LocationSchedule {
  id          String      @id @default(uuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  masterData  Json
  llmProvider LLMProvider @default(GEMINI_25_FLASH_LITE)
  createdAt   DateTime    @default(now())
  @@index([userId, createdAt])
}

model UsageLog {
  id            String      @id @default(uuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  provider      LLMProvider
  inputTokens   Int
  outputTokens  Int
  cost          Float       // USD（無料枠は0）
  createdAt     DateTime    @default(now())
  @@index([userId, createdAt])
  @@index([provider, createdAt])
}
```

---

## 🚀 開発フェーズ

## 🚀 開発計画（依存関係ベース）

**Agent Swarm による並列開発**で進めます。時間軸ではなく、依存関係の解決を基準にWave単位で並列実行します。

詳細な進め方は [`agent-swarm-guide.md`](./agent-swarm-guide.md) を参照。

### Wave 1: 基盤構築（独立して並列実行）

| エージェント | 成果物 | 依存 |
|-------------|--------|------|
| `ui-research` | `docs/ui-analysis.md` | なし |
| `database-schema` | `prisma/schema.prisma` | なし |
| `auth-api` | `src/app/api/auth/` | なし |
| `llm-factory` | `src/lib/llm/factory.ts` | なし |

**完了条件**: Gemini 2.5 Flash-Lite で動作確認

### Wave 2: UI/LLM連携（Wave 1 完了後に並列実行）

| エージェント | 成果物 | 依存 |
|-------------|--------|------|
| `design-system` | `src/components/ui/` | ui-research |
| `llm-gemini` | `src/lib/llm/clients/gemini.ts` | llm-factory |
| `llm-grok` | `src/lib/llm/clients/grok.ts` | llm-factory |
| `llm-perplexity` | `src/lib/llm/clients/perplexity.ts` | llm-factory |

**完了条件**: LLM切り替えが動作

### Wave 3: 機能実装（Wave 2 完了後に並列実行）

| エージェント | 成果物 | 依存 |
|-------------|--------|------|
| `pj-a-meeting` | `src/components/meeting-notes/` | design-system, llm-gemini |
| `pj-b-transcript` | `src/components/transcripts/` | design-system, llm-gemini |
| `pj-c-research` | `src/components/research/` | design-system, llm-grok, llm-perplexity |
| `pj-d-schedule` | `src/components/location-schedule/` | design-system, llm-gemini |
| `google-drive` | `src/lib/google/drive.ts` | auth-api |

**完了条件**: 全PJが動作

### Wave 4: 統合・最適化（必要に応じて）

| エージェント | 成果物 | 依存 |
|-------------|--------|------|
| `optimization` | キャッシュ実装 | 全機能 |
| `testing` | テスト・バグ修正 | 全機能 |

- LLMレスポンスキャッシュ実装
- 使用量モニタリング
- バグ修正・最適化

---

## 🎯 次のアクション

1. **Wave 3完了**: pj-d-scheduleとgoogle-driveを並列で実装
2. **Wave 4開始**: キャッシュ実装と統合テスト
3. **Vercelデプロイ**: 本番環境へのデプロイ

---

## 💰 コスト試算（最終版）

### インフラ（全て無料枠）

| サービス | プラン | 月額 |
|---------|------|------|
| Vercel | Hobby | $0 |
| Neon PostgreSQL | Free | $0 |
| Upstash Redis | Free | $0 |
| Google Drive API | 無料 | $0 |

### LLM API

| 用途 | LLM | 月額コスト |
|------|-----|----------|
| PJ-A/B/D（テキスト整形） | Gemini（Google AI Studio無料枠） | **$0** |
| PJ-C 人探し | Grok 4.1 Fast（$25無料クレジット） | **$0**（初月） |
| PJ-C エビデンス | Perplexity Sonar | $0.50-1.00 |
| **合計** | | **$0〜1/月**（初期） |

### 無料枠を超えた場合

| シナリオ | 月額 |
|---------|------|
| 最小使用（月10回） | $0（全て無料枠内） |
| 通常使用（月50回） | $1-2（Grok + Perplexityのみ課金） |
| フル活用（月100回+） | $3-5 |

---

## ✅ 最終チェックリスト

### 開発開始前（人間の作業が必要）

> **⚠️ 以下はエージェントでは実行できません。開発者が事前に完了させてください。**
> **詳細は [`agent-swarm-guide.md`](./agent-swarm-guide.md#人間の介入ポイント) を参照。**

- [x] Google AI Studio でAPIキーを取得（https://aistudio.google.com/）
- [x] xAI でAPIキーを取得（$25無料クレジット）
- [x] Perplexity APIキーを取得（必要なら）
- [x] Google Cloud Console で OAuth クライアントID/シークレットを取得
- [x] `.env.local` を作成し、APIキー/認証情報を設定
- [x] `docs/assets/images/` にGrok UI参考画像を配置

### Wave 1 完了時（基盤構築）

- [x] `src/lib/llm/factory.ts` → Gemini 2.5 Flash-Lite 動作確認
- [x] `prisma/schema.prisma` → `LLMProvider` Enum 定義
- [x] NextAuth.js → Google Workspace SSO 動作
- [x] Vercelデプロイ成功

### Wave 2 完了時（UI/LLM連携）

- [x] Grok 4.1 Fast → X Search 動作確認
- [x] Perplexity Sonar → エビデンス付き回答確認
- [x] LLM選択UI → 切り替え動作確認

### Wave 3 完了時（機能実装）

- [x] PJ-A/B/D → Gemini無料枠で動作
- [x] PJ-B → テキスト貼り付けのみで動作（映像アップロード不要）
- [x] PJ-C → 人探し・エビデンス検索が動作

### Wave 4 完了時（統合・最適化）

- [ ] UsageLog → 使用量記録確認
- [ ] LLMキャッシュ → 動作確認
- [ ] 月額コスト → $3以下で運用可能

---

## 📚 関連ドキュメント

| ドキュメント | 用途 |
|-------------|------|
| `llm-integration.md` | 複数LLM統合設計 |
| `../assets/` | 参考資料（リサーチ、議事録、ロケスケ等） |
| `../archive/` | 過去の議論・旧プラン |

---

**初期運用は Google AI Studio 無料枠 + xAI $25クレジットでスタート。月額コスト $0〜1 で運用開始可能。** ✅
