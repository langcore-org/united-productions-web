# システムプロンプト生成フロー

> **システムプロンプトの生成からLLM送信までの流れ**
>
> **最終更新**: 2026-02-25 12:30

---

## 概要

システムプロンプトは以下の2つの要素を結合して生成されます：

1. **番組情報**（背景知識）- コード内に直接定義
2. **機能プロンプト**（役割・指示）- DBから動的取得

---

## アーキテクチャ図

```mermaid
flowchart TB
    subgraph Client["クライアント"]
        A[FeatureChat.tsx<br/>ユーザー入力 + featureId + programId]
    end

    subgraph Hooks["カスタムフック"]
        B[useLLMStream.ts]
    end

    subgraph APIClient["APIクライアント"]
        C[llm-client.ts<br/>POST /api/llm/stream]
    end

    subgraph APIRoute["APIルート"]
        D[stream/route.ts]
        E[buildSystemPrompt]
    end

    subgraph PromptBuilder["プロンプト構築"]
        F[lib/prompts/system-prompt.ts]
        G[番組情報データ<br/>直接定義]
        H[DB: FeaturePrompt]
        I[DB: SystemPrompt]
    end

    subgraph LLM["LLM"]
        J[Grok API]
    end

    A -->|startStream| B
    B -->|streamLLMResponse| C
    C -->|fetch| D
    D -->|呼び出し| E
    E -->|buildProgramPrompt| F
    F -->|読み込み| G
    F -->|SELECT| H
    H -->|promptKey| I
    I -->|content| F
    F -->|結合| E
    E -->|systemPrompt| D
    D -->|messagesWithSystem| J
```

---

## 詳細フロー

### 1. クライアントからAPIへ

```mermaid
sequenceDiagram
    actor User as ユーザー
    participant FC as FeatureChat.tsx
    participant Hook as useLLMStream
    participant Client as llm-client.ts
    participant API as /api/llm/stream

    User->>FC: バラエティ企画に合う若手俳優を探して
    FC->>Hook: startStream(messages, provider, featureId, programId)
    Note over FC,Hook: featureId: "research-cast", programId: "shikujiri"
    Hook->>Client: streamLLMResponse(params)
    Note over Hook,Client: featureId: "research-cast", programId: "shikujiri"
    Client->>API: POST /api/llm/stream
```

**送信パラメータ**:
```typescript
{
  messages: LLMMessage[];
  provider?: string;        // "grok-4-1-fast"
  featureId?: string;       // "research-cast"
  programId?: string;       // "shikujiri" | "all"
}
```

---

### 2. APIルートでのプロンプト生成

```mermaid
sequenceDiagram
    participant API as stream/route.ts
    participant SP as system-prompt.ts
    participant DB1 as FeaturePrompt<br/>テーブル
    participant DB2 as SystemPrompt<br/>テーブル

    API->>SP: buildSystemPrompt("shikujiri", "research-cast")

    SP->>SP: buildProgramPrompt("shikujiri")
    Note over SP: 会社概要 + 番組情報（約800文字）

    SP->>DB1: SELECT FROM FeaturePrompt WHERE featureId = 'research-cast'
    DB1-->>SP: promptKey: 'RESEARCH_CAST'

    SP->>DB2: SELECT FROM SystemPrompt WHERE key = 'RESEARCH_CAST'
    DB2-->>SP: content: '## 出演者リサーチ...'

    SP->>SP: 結合（セパレータ付き）
    Note over SP: 番組情報 + 機能プロンプト（約2000文字）

    SP-->>API: systemPrompt
```

---

### 3. 生成されるプロンプト構造

```mermaid
graph LR
    A[会社概要<br/>~300文字] -->|結合| C[システムプロンプト<br/>~2000文字]
    B[番組情報<br/>~500文字] -->|結合| C
    D[セパレータ<br/>---] -->|結合| C
    E[機能プロンプト<br/>~1200文字] -->|結合| C
```

**実際のプロンプト構成**:

```markdown
# United Productions 会社概要

## 基本情報
- 社名: 株式会社UNITED PRODUCTIONS...
...

---

## しくじり先生 俺みたいになるな!!

- 放送局: テレビ朝日系列
- 放送時間: 毎週月曜 23:15〜
- MC/出演者: ギャル曽根
...

---

上記の詳細な番組情報を前提知識として保持してください。
...

---

## 機能固有の指示

## 出演者リサーチ

あなたはテレビ制作の出演者リサーチ専門家です。

### 情報収集（重要）
**最新情報や詳細な情報が必要な場合は、積極的にツールを使用してください：**
- **Web検索**: 出演者の最新情報...
- **X検索**: ソーシャルメディアでの話題性...
...
```

---

## データフロー図

```mermaid
flowchart LR
    subgraph DataSources["データソース"]
        direction TB
        Code[コード内データ<br/>lib/prompts/system-prompt.ts]
        DB1[(FeaturePrompt<br/>マッピングテーブル)]
        DB2[(SystemPrompt<br/>プロンプトテーブル)]
    end

    subgraph BuildProcess["構築プロセス"]
        direction TB
        B1[buildProgramPrompt<br/>番組情報部分]
        B2[getPromptByFeatureId<br/>機能プロンプト取得]
        B3[結合<br/>セパレータ挿入]
    end

    subgraph Output["出力"]
        O[システムプロンプト<br/>LLMへ送信]
    end

    Code --> B1
    DB1 --> B2
    DB2 --> B2
    B1 --> B3
    B2 --> B3
    B3 --> O
```

---

## ファイル構成

```
lib/prompts/
├── system-prompt.ts      # 一元管理ファイル
│   ├── COMPANY_INFO      # 会社概要データ
│   ├── PROGRAMS          # 番組情報データ（13本）
│   ├── formatCompany()   # フォーマット関数
│   ├── formatProgram()   # フォーマット関数
│   ├── getPromptByFeatureId()  # DB取得
│   └── buildSystemPrompt()     # 公開API
│
└── （他のファイルは削除済み）

prisma/schema.prisma
├── SystemPrompt          # プロンプト本体
└── FeaturePrompt         # featureId → promptKey マッピング
```

---

## 新機能追加フロー

```mermaid
sequenceDiagram
    actor Admin as 管理者
    participant DB as データベース
    participant API as APIルート
    participant User as ユーザー

    Admin->>DB: INSERT SystemPrompt(key, content)
    Note over Admin,DB: key: 'RESEARCH_VTUBER'
    Admin->>DB: INSERT FeaturePrompt(featureId, promptKey)
    Note over Admin,DB: featureId: 'research-vtuber'
    DB-->>Admin: 完了

    Note over Admin,User: コード変更・デプロイ不要

    User->>API: featureId: 'research-vtuber'
    API->>DB: 新しいプロンプトを取得
    DB-->>API: VTuberリサーチ用プロンプト
    API-->>User: 応答
```

**手順**:

1. **SystemPromptテーブルにINSERT**
   ```sql
   INSERT INTO "SystemPrompt" ("id", "key", "name", "content", "category", "isActive")
   VALUES (
     'prompt_research_vtuber',
     'RESEARCH_VTUBER',
     'VTuberリサーチ',
     '## VTuberリサーチ\n\nあなたはVTuberリサーチ専門家です...',
     'research',
     true
   );
   ```

2. **FeaturePromptテーブルにINSERT**
   ```sql
   INSERT INTO "FeaturePrompt" ("id", "featureId", "promptKey", "isActive")
   VALUES (
     'fp_research_vtuber',
     'research-vtuber',
     'RESEARCH_VTUBER',
     true
   );
   ```

3. **完了** - フロントエンドから `featureId: "research-vtuber"` を送信するだけで動作

---

## エラーハンドリング

```mermaid
flowchart TD
    A[buildSystemPrompt呼び出し] --> B{featureIdあり?}
    B -->|No| C[番組情報のみ返却]
    B -->|Yes| D[DB: FeaturePrompt検索]
    D --> E{見つかる?}
    E -->|No| C
    E -->|Yes| F[DB: SystemPrompt検索]
    F --> G{見つかる?}
    G -->|No| C
    G -->|Yes| H[結合して返却]
    C --> I[正常応答]
    H --> I
```

**フォールバック動作**:
- FeaturePromptが見つからない → 番組情報のみ
- SystemPromptが見つからない → 番組情報のみ
- DBエラー → エラーを投げる（呼び出し元で処理）

---

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `lib/prompts/system-prompt.ts` | プロンプト構築の中核 |
| `app/api/llm/stream/route.ts` | APIエンドポイント |
| `prisma/schema.prisma` | DBスキーマ定義 |
| `hooks/useLLMStream/index.ts` | ストリーミング制御 |
| `components/ui/FeatureChat.tsx` | ユーザーインターフェース |

---

## パフォーマンス考慮事項

| 項目 | 現状 | 備考 |
|-----|------|------|
| DBクエリ回数 | 2回（FeaturePrompt + SystemPrompt） | 必要最小限 |
| キャッシュ | なし | プロンプト変更即時反映のため |
| プロンプトサイズ | 約800〜3000文字 | 機能により変動 |
| 生成時間 | < 10ms | DBレイテンシ除く |

**将来的な最適化**（必要に応じて）:
- Next.js `unstable_cache` でプロンプトをキャッシュ（TTL: 5分）
- Redisキャッシュ（高負荷時）
