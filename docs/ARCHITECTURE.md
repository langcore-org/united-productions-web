# アーキテクチャ設計書

## システム概要

AI Hubは、テレビ制作業務を支援するための統合プラットフォームです。Next.jsをベースに、複数のAI/LLMサービスを統合し、制作現場の業務効率化を実現します。

## アーキテクチャ図

```mermaid
flowchart TB
    subgraph Client["クライアント層"]
        direction TB
        Dashboard["ダッシュボード"]
        Meeting["議事録作成"]
        Minutes["議事録作成"]
        Proposal["新企画立案"]
        Research["リサーチ"]
        ResearchCast["出演者リサーチ"]
        ResearchLocation["場所リサーチ"]
        ResearchInfo["情報リサーチ"]
        ResearchEvidence["エビデンスリサーチ"]
        Transcript["文字起こし変換"]
        TranscriptNa["NA原稿作成"]
        Schedule["ロケスケページ"]
        ProgramSettings["番組設定"]
        
        Dashboard --> ReactComponents
        Meeting --> ReactComponents
        Minutes --> ReactComponents
        Proposal --> ReactComponents
        Research --> ReactComponents
        ResearchCast --> ReactComponents
        ResearchLocation --> ReactComponents
        ResearchInfo --> ReactComponents
        ResearchEvidence --> ReactComponents
        Transcript --> ReactComponents
        TranscriptNa --> ReactComponents
        Schedule --> ReactComponents
        ProgramSettings --> ReactComponents
        
        subgraph ReactComponents["React Components"]
            direction TB
            SCC["Server/Client Components"]
            FeatureChat["FeatureChat<br/>共通チャットUI"]
        end
    end
    
    subgraph API["API層"]
        direction TB
        Router["Next.js App Router"]
        
        subgraph Endpoints["API Endpoints"]
            direction LR
            LLM["/api/llm/*"]
            MeetingAPI["/api/meeting-notes"]
            ResearchAPI["/api/research"]
            ScheduleAPI["/api/schedules"]
            ChatFeatureAPI["/api/chat/feature"]
            SettingsAPI["/api/settings/program"]
        end
        
        subgraph MiddlewareLayer["Middleware"]
            direction TB
            Auth["認証・レート制限"]
            NextAuth["NextAuth.js + Rate Limit Upstash"]
        end
        
        Router --> Endpoints
        Endpoints --> MiddlewareLayer
    end
    
    subgraph Service["サービス層"]
        direction TB
        
        subgraph LLMFactory["LLM Factory Pattern"]
            direction TB
            
            subgraph Clients["LLM Clients"]
                direction LR
                Gemini["Gemini Client"]
                Grok["Grok Client"]
                Perplexity["Perplexity Client"]
                OpenAI["OpenAI/Claude Wave 2"]
            end
            
            subgraph CacheRate["Cache & Rate Limit"]
                direction LR
                ResponseCache["Response Cache Upstash"]
                RateLimiter["Rate Limiter Upstash"]
            end
            
            Clients --> CacheRate
        end
        
        subgraph PromptMgmt["Prompt Management"]
            direction LR
            ResearchCastPrompt["Research Cast Prompt"]
            ResearchLocationPrompt["Research Location Prompt"]
            ResearchInfoPrompt["Research Info Prompt"]
            ResearchEvidencePrompt["Research Evidence Prompt"]
            MinutesPrompt["Minutes Prompt"]
            ProposalPrompt["Proposal Prompt<br/>(動的生成)"]
            TranscriptPrompt["Transcript Prompt"]
            NaScriptPrompt["NA Script Prompt"]
        end
    end
    
    subgraph Data["データ層"]
        direction LR
        
        subgraph PostgreSQL["PostgreSQL Neon"]
            direction TB
            Users["Users"]
            MeetingNotes["MeetingNotes"]
            Transcripts["Transcripts"]
            ResearchChats["ResearchChats"]
            Schedules["Schedules"]
            UsageLogs["UsageLogs"]
            ProgramSettingsDB["ProgramSettings"]
        end
        
        subgraph UpstashRedis["Upstash Redis"]
            direction TB
            LLMCache["LLM Cache"]
            RateLimit["Rate Limit"]
            SessionStore["Session Store"]
        end
    end
    
    subgraph External["外部サービス"]
        direction LR
        GoogleOAuth["Google OAuth"]
        XAI["xAI API"]
        PerplexityAPI["Perplexity API"]
        GeminiAPI["Google Gemini"]
        UpstashAPI["Upstash Redis"]
    end
    
    Client --> API
    API --> Service
    Service --> Data
    Service --> External
    Data --> External

    %% スタイリング - モノトーン（ダークモード対応）
    classDef default fill:#2a2a2a,stroke:#e0e0e0,stroke-width:2px,color:#f0f0f0
    classDef client fill:#3a3a3a,stroke:#d0d0d0,stroke-width:2px,color:#f0f0f0
    classDef api fill:#333333,stroke:#c0c0c0,stroke-width:2px,color:#f0f0f0
    classDef service fill:#2e2e2e,stroke:#b0b0b0,stroke-width:2px,color:#f0f0f0
    classDef data fill:#262626,stroke:#a0a0a0,stroke-width:2px,color:#f0f0f0
    classDef external fill:#1f1f1f,stroke:#909090,stroke-width:2px,color:#f0f0f0
    classDef highlight fill:#4a4a4a,stroke:#ffffff,stroke-width:2px,color:#ffffff
    
    class Dashboard,Meeting,Minutes,Proposal,Research,ResearchCast,ResearchLocation,ResearchInfo,ResearchEvidence,Transcript,TranscriptNa,Schedule,ProgramSettings,ReactComponents client
    class Router,Endpoints,MiddlewareLayer,LLM,MeetingAPI,ResearchAPI,ScheduleAPI,ChatFeatureAPI,SettingsAPI,Auth,NextAuth api
    class LLMFactory,Clients,CacheRate,PromptMgmt,Gemini,Grok,Perplexity,OpenAI,ResponseCache,RateLimiter,ResearchCastPrompt,ResearchLocationPrompt,ResearchInfoPrompt,ResearchEvidencePrompt,MinutesPrompt,ProposalPrompt,TranscriptPrompt,NaScriptPrompt service
    class Data,PostgreSQL,UpstashRedis,Users,MeetingNotes,Transcripts,ResearchChats,Schedules,UsageLogs,ProgramSettingsDB,LLMCache,RateLimit,SessionStore data
    class External,GoogleOAuth,XAI,PerplexityAPI,GeminiAPI,UpstashAPI external
    class SCC,FeatureChat highlight
```

## 設計原則

### 1. レイヤードアーキテクチャ

```mermaid
flowchart TB
    subgraph Layers["レイヤー構成"]
        direction TB
        
        PL["Presentation Layer<br/>UI Components"]
        AL["API Layer<br/>Next.js API Routes"]
        SL["Service Layer<br/>Business Logic"]
        DAL["Data Access Layer<br/>Prisma/Redis"]
        ES["External Services<br/>LLM APIs"]
        
        PL --> AL
        AL --> SL
        SL --> DAL
        DAL --> ES
    end
    
    classDef layer fill:#2a2a2a,stroke:#e0e0e0,stroke-width:2px,color:#f0f0f0
    class PL,AL,SL,DAL,ES layer
```

### 2. Factory Pattern (LLM統合)

複数のLLMプロバイダーを統一インターフェースで扱うため、Factoryパターンを採用しています。

```typescript
// lib/llm/factory.ts
export function createLLMClient(provider: LLMProvider): LLMClient {
  switch (provider) {
    case 'gemini-2.5-flash-lite':
    case 'gemini-3.0-flash':
      return new GeminiClient(provider);
    case 'grok-4.1-fast':
    case 'grok-4':
      return new GrokClient(provider);
    // ...
  }
}
```

### 3. FeatureChat パターン

各機能ページで共通して使用するチャットUIを `FeatureChat` コンポーネントとして実装しています。

```typescript
// components/ui/FeatureChat.tsx
interface FeatureChatProps {
  featureId: string;          // 機能識別子
  title: string;              // ページタイトル
  systemPrompt: string;       // システムプロンプト
  placeholder: string;        // 入力欄プレースホルダー
  inputLabel?: string;        // 入力エリアラベル
  outputFormat?: "markdown" | "plaintext";  // 出力形式
}
```

**特徴:**
- ストリーミングレスポンス対応
- 会話履歴の自動保存（Prisma）
- plaintextモード時のWordコピー機能
- 各機能別のシステムプロンプト切り替え

### 4. Prompt Management

システムプロンプトは `lib/prompts/` ディレクトリで管理しています。

```
lib/prompts/
├── research-cast.ts      # 出演者リサーチ
├── research-location.ts  # 場所リサーチ
├── research-info.ts      # 情報リサーチ
├── research-evidence.ts  # エビデンスリサーチ
├── minutes.ts            # 議事録作成
├── proposal.ts           # 新企画立案（動的生成）
├── transcript.ts         # 文字起こし変換
└── na-script.ts          # NA原稿作成
```

### 5. キャッシュ戦略

- **LLMレスポンスキャッシュ**: 同一プロンプトの重複リクエストを削減（TTL: 24時間）
- **レート制限**: プロバイダー別のAPI制限を管理（RPM/RPD）

### 6. 認証・認可

- **NextAuth.js**: Google OAuth 2.0によるSSO
- **JWTセッション**: ステートレス認証
- **Prisma Adapter**: ユーザーデータの永続化

## ページ構成

### サイドバーナビゲーション

```
├── リサーチ（折りたたみ）
│   ├── 出演者リサーチ     → /research/cast
│   ├── 場所リサーチ       → /research/location
│   ├── 情報リサーチ       → /research/info
│   └── エビデンスリサーチ → /research/evidence
├── 議事録作成             → /minutes
├── 新企画立案             → /proposal
├── 文字起こし（折りたたみ）
│   ├── フォーマット変換   → /transcript
│   └── NA原稿作成         → /transcript/na
└── 番組設定               → /settings/program
```

### 各機能ページ

| ページ | パス | 説明 |
|--------|------|------|
| 出演者リサーチ | `/research/cast` | 企画に適した出演者候補を提案 |
| 場所リサーチ | `/research/location` | ロケ地候補と撮影条件を調査 |
| 情報リサーチ | `/research/info` | テーマに関する情報を収集・整理 |
| エビデンスリサーチ | `/research/evidence` | 情報の真偽を検証 |
| 議事録作成 | `/minutes` | 文字起こしから議事録を作成 |
| 新企画立案 | `/proposal` | 番組情報を基に新企画を提案 |
| 文字起こし変換 | `/transcript` | テキスト整形・フォーマット変換 |
| NA原稿作成 | `/transcript/na` | ナレーション原稿を作成（Wordコピー対応） |
| 番組設定 | `/settings/program` | 番組情報・過去企画を管理 |

## データモデル

### ER図

```mermaid
erDiagram
    USER {
        string id PK
        string email
        string name
        string image
        string googleId
        datetime createdAt
    }
    
    MEETING_NOTE {
        string id PK
        string userId FK
        string type
        string rawText
        string formatted
        string llmProvider
        string status
        datetime createdAt
    }
    
    TRANSCRIPT {
        string id PK
        string userId FK
        string rawText
        string formatted
        string llmProvider
        datetime createdAt
    }
    
    RESEARCH_CHAT {
        string id PK
        string userId FK
        string agentType
        string llmProvider
        json messages
        datetime createdAt
    }
    
    RESEARCH_MESSAGE {
        string id PK
        string chatId FK
        string role
        string content
        string thinking
        datetime createdAt
    }
    
    LOCATION_SCHEDULE {
        string id PK
        string userId FK
        json masterData
        string llmProvider
        datetime createdAt
    }
    
    PROGRAM_SETTINGS {
        string id PK
        string userId FK
        string programInfo
        string pastProposals
        datetime updatedAt
    }
    
    USAGE_LOG {
        string id PK
        string userId FK
        string provider
        int inputTokens
        int outputTokens
        float cost
        json metadata
        datetime createdAt
    }
    
    USER ||--o{ MEETING_NOTE : "creates"
    USER ||--o{ TRANSCRIPT : "creates"
    USER ||--o{ RESEARCH_CHAT : "has"
    USER ||--o{ LOCATION_SCHEDULE : "creates"
    USER ||--o{ PROGRAM_SETTINGS : "has"
    USER ||--o{ USAGE_LOG : "generates"
    RESEARCH_CHAT ||--o{ RESEARCH_MESSAGE : "contains"

    %% スタイリング - モノトーン
    classDef entity fill:#2a2a2a,stroke:#e0e0e0,stroke-width:2px,color:#f0f0f0
    class USER,MEETING_NOTE,TRANSCRIPT,RESEARCH_CHAT,RESEARCH_MESSAGE,LOCATION_SCHEDULE,PROGRAM_SETTINGS,USAGE_LOG entity
```

### 主要モデル

| モデル | 説明 |
|-------|------|
| `User` | ユーザー情報（NextAuth連携） |
| `MeetingNote` | 議事録データ（PJ-A） |
| `Transcript` | NA原稿データ（PJ-B） |
| `ResearchChat` | リサーチチャット履歴（PJ-C） |
| `ResearchMessage` | チャットメッセージ |
| `LocationSchedule` | ロケスケジュール（PJ-D） |
| `ProgramSettings` | 番組設定（新企画立案で使用） |
| `UsageLog` | LLM使用ログ |

## セキュリティ設計

### 認証フロー

```mermaid
sequenceDiagram
    participant C as Client
    participant NA as NextAuth Handler
    participant GO as Google OAuth
    participant UC as User Consent
    participant JWT as JWT Token
    participant SV as Session Validate
    participant API as API Routes
    
    C->>NA: 認証リクエスト
    NA->>GO: OAuthリクエスト
    GO->>UC: 同意画面表示
    UC-->>GO: 同意
    GO-->>NA: 認証コード
    NA->>JWT: トークン生成
    JWT-->>NA: JWT Token
    NA-->>C: 認証完了
    
    C->>API: APIリクエスト
    API->>SV: セッション検証
    SV->>JWT: トークン検証
    JWT-->>SV: 検証結果
    SV-->>API: 検証成功
    API-->>C: レスポンス

    %% スタイリング - モノトーン
    classDef participant fill:#2a2a2a,stroke:#e0e0e0,stroke-width:2px,color:#f0f0f0
    class C,NA,GO,UC,JWT,SV,API participant
```

### セキュリティ対策

1. **環境変数管理**: 機密情報は`.env.local`で管理
2. **APIキー保護**: LLM APIキーはサーバーサイドのみで使用
3. **レート制限**: 悪意あるリクエストを防止
4. **入力バリデーション**: Zodによる厳格なバリデーション
5. **CORS設定**: 適切なオリジン制限

## パフォーマンス設計

### 最適化戦略

| 戦略 | 実装 |
|-----|------|
| レスポンスキャッシュ | Upstash Redis（24時間TTL） |
| レート制限 | Upstash Redis（スライディングウィンドウ） |
| 画像最適化 | Next.js Imageコンポーネント |
| フォント最適化 | next/font（Geist） |
| コード分割 | 動的インポート（必要に応じて） |
| ストリーミング | Server-Sent Eventsによるリアルタイムレスポンス |

### スケーリング

- **水平スケーリング**: Vercel Edge Network
- **データベース**: Neon Serverless Postgres（自動スケーリング）
- **キャッシュ**: Upstash Redis（サーバーレス）

## エラーハンドリング

### エラー階層

```mermaid
flowchart TB
    subgraph ErrorHierarchy["エラー階層"]
        direction TB
        
        AE["Application Error<br/>業務ロジックエラー・バリデーション"]
        APIE["API Error<br/>LLM APIエラー・外部サービスエラー"]
        IE["Infrastructure Error<br/>DB接続・Redis接続・ネットワーク"]
        SE["System Error<br/>予期しないエラー"]
        
        AE --> APIE
        APIE --> IE
        IE --> SE
    end
    
    classDef error1 fill:#3a3a3a,stroke:#e0e0e0,stroke-width:2px,color:#f0f0f0
    classDef error2 fill:#333333,stroke:#c0c0c0,stroke-width:2px,color:#f0f0f0
    classDef error3 fill:#2a2a2a,stroke:#a0a0a0,stroke-width:2px,color:#f0f0f0
    classDef error4 fill:#1f1f1f,stroke:#808080,stroke-width:2px,color:#f0f0f0
    
    class AE error1
    class APIE error2
    class IE error3
    class SE error4
```

### エラーレスポンス形式

```typescript
{
  error: string;        // エラーコード
  message: string;      // 人間可読なメッセージ
  details?: unknown;    // 詳細情報（開発時のみ）
  retryAfter?: number;  // レート制限時の再試行秒数
}
```

## モニタリング・ロギング

### ログレベル

```mermaid
flowchart LR
    subgraph LogLevels["ログレベル"]
        direction LR
        
        ERROR["ERROR<br/>システムエラー<br/>APIエラー"]
        WARN["WARN<br/>レート制限到達<br/>キャッシュミス"]
        INFO["INFO<br/>ユーザーアクション<br/>主要処理"]
        DEBUG["DEBUG<br/>開発時の詳細ログ"]
        
        ERROR --> WARN
        WARN --> INFO
        INFO --> DEBUG
    end
    
    classDef error fill:#3a3a3a,stroke:#e0e0e0,stroke-width:2px,color:#f0f0f0
    classDef warn fill:#333333,stroke:#c0c0c0,stroke-width:2px,color:#f0f0f0
    classDef info fill:#2a2a2a,stroke:#a0a0a0,stroke-width:2px,color:#f0f0f0
    classDef debug fill:#1f1f1f,stroke:#808080,stroke-width:2px,color:#f0f0f0
    
    class ERROR error
    class WARN warn
    class INFO info
    class DEBUG debug
```

- **ERROR**: システムエラー、APIエラー
- **WARN**: レート制限到達、キャッシュミス
- **INFO**: ユーザーアクション、主要処理
- **DEBUG**: 開発時の詳細ログ

### 使用状況トラッキング

`UsageLog`モデルで以下を記録：
- ユーザーID
- 使用プロバイダー
- 入力/出力トークン数
- 推定コスト（USD）
- メタデータ（エンドポイント等）

## 将来の拡張性

### Wave 2で予定

```mermaid
flowchart LR
    subgraph Wave2["Wave 2 拡張計画"]
        direction LR
        
        LLM["追加LLM対応<br/>OpenAI, Anthropic"]
        File["ファイルアップロード<br/>PDF, 画像解析"]
        Team["チーム機能<br/>権限管理, 共有機能"]
        Webhook["Webhook<br/>外部システム連携"]
        
        LLM --> File
        File --> Team
        Team --> Webhook
    end
    
    classDef wave2 fill:#2a2a2a,stroke:#e0e0e0,stroke-width:2px,color:#f0f0f0
    class LLM,File,Team,Webhook wave2
```

1. **追加LLM対応**: OpenAI, Anthropic
2. **ファイルアップロード**: PDF, 画像解析
3. **チーム機能**: 権限管理、共有機能
4. **Webhook**: 外部システム連携

### 拡張ポイント

- `lib/llm/clients/`: 新しいLLMクライアントを追加
- `lib/prompts/`: 新しい機能のプロンプトを追加
- `app/api/`: 新しいAPIエンドポイントを追加
- `prisma/schema.prisma`: データモデルの拡張
