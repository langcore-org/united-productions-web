# Claude Code Agent API 統合計画（大幅改訂版）

> **作成日**: 2026-03-07  
> **改訂日**: 2026-03-07  
> **目的**: Teddy（AI Hub）の既存機能をClaude Codeに移行し、Claude Codeが必要に応じてGrok（xAI）を呼び出す設計に変更  
> **統合方式**: Agent APIラッパー + xAI API連携（ハイブリッド）
> **開発方式**: **Claude Codeメイン**（人間は指示・レビュー・テスト）

---

## 関連ドキュメント

| ドキュメント | 内容 | リンク |
|-------------|------|--------|
| **neta-researcher移植検討** | United Productionsからの移植調査結果 | [`/docs/backlog/research-neta-researcher-porting.md`](/docs/backlog/research-neta-researcher-porting.md) |
| **LLM APIツール比較** | 各種LLM APIのツール比較 | [`/docs/backlog/research-llm-api-tools-comparison.md`](/docs/backlog/research-llm-api-tools-comparison.md) |
| **参考: United Productions Agent** | Agent APIラッパーの参考実装 | [`/reference/up-web-legacy/agent/`](/reference/up-web-legacy/agent/) |
| **エージェンティック設計** | Teddyのエージェンティック設計 | [`/docs/plans/agentic-chat-design.md`](/docs/plans/agentic-chat-design.md) |

---

## 1. 概要（改訂）

### 1.1 設計方針の変更

**旧設計**: Claude Codeを新規機能として追加し、Grokと併用  
**新設計**: **既存機能をClaude Codeに全面移行**し、Claude Codeが必要に応じてGrok（xAI API）を呼び出す

### 1.2 新アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 一般チャット  │  │ 出演者リサーチ │  │ エビデンス    │  ...   │
│  │ (DeepR ON/OFF)│  │ (Claude Code) │  │ (Claude Code)│        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
└─────────┼─────────────────┼─────────────────┼──────────────────┘
          │                 │                 │
          │     ┌───────────┴─────────────────┘
          │     │ 全機能 → Agent API（Claude Code）
          │     ▼
          │  ┌─────────────────────────────────────┐
          │  │  /api/agent/chat                    │
          │  │  - Claude Code（メイン思考エンジン） │
          │  │  - WebSearch, TodoWrite, Bash等     │
          │  │  - Google Drive MCP連携             │
          │  └──────────────┬──────────────────────┘
          │                 │
          │    ┌────────────┴────────────┐
          │    │ ツールとしてxAI API呼び出し │
          │    │ （必要に応じてGrokを使用）  │
          │    ▼
          │  ┌───────────────────────────────┐
          │  │  x_search（X検索）            │
          │  │  web_search（必要時）         │
          │  │  その他Grok特有の機能         │
          │  └───────────────────────────────┘
          │
          ▼（Deep Research OFF時）
        ┌───────────────────────────────┐
        │  /api/llm/stream（簡易モード） │
        │  - Grok直接（軽量・高速応答）   │
        └───────────────────────────────┘
```

### 1.3 機能別設定

| 機能 | メインエンジン | xAI API呼び出し | Deep Research |
|------|---------------|----------------|---------------|
| **一般チャット** | Claude Code | 必要時 | ON/OFF選択可能 |
| **出演者リサーチ** | Claude Code | X検索等 | 常時ON |
| **エビデンスリサーチ** | Claude Code | X検索等 | 常時ON |
| **新企画立案** | Claude Code | X検索等 | 常時ON |
| **議事録作成** | Claude Code | なし | 常時OFF（軽量） |

---

## 2. 詳細アーキテクチャ（マーメイド図）

### 2.1 全体システム構成

```mermaid
flowchart TB
    subgraph Frontend["🖥️ Frontend (Next.js)"]
        Sidebar["サイドバー<br/>機能選択"]
        ChatUI["チャットUI"]
        DeepRToggle["🔘 Deep Research<br/>ON/OFFトグル"]
        ToolIndicator["🔧 ToolCallIndicator<br/>ツール実行状態表示"]
        TaskList["📝 TaskList<br/>TodoWrite連携"]
    end

    subgraph APILayer["🔌 API Layer (Next.js API Routes)"]
        direction TB
        Router["リクエスト振り分け"]
        
        subgraph AgentAPIRoutes["/api/agent/*"]
            AgentChat["/api/agent chat POST"]
            AgentStream["/api/agent/sessions/:id/stream GET"]
            AgentBuffer["/api/agent/sessions/:id/buffer GET"]
        end
        
        subgraph GrokAPIRoutes["/api/llm/*"]
            GrokStream["/api/llm/stream POST"]
        end
    end

    subgraph AgentService["🤖 Agent API Service (FastAPI)"]
        direction TB
        OpenAIEndpoint["/v1/chat completions OpenAI互換"]
        SessionMgr["SessionManager"]
        ToolRegistry["ToolRegistry"]
        
        subgraph Tools["利用可能ツール"]
            WebSearch["🔍 WebSearch<br/>Web検索"]
            TodoWrite["📝 TodoWrite<br/>タスク管理"]
            Bash["⚡ Bash<br/>コマンド実行"]
            GDrive["📁 Google Drive<br/>MCP連携"]
            XSearch["🐦 x_search<br/>X(Twitter)検索"]
            GrokSearch["🌐 grok_web_search<br/>Grok検索"]
        end
    end

    subgraph ExternalAPIs["🌐 External APIs"]
        ClaudeAPI["Anthropic API<br/>Claude Code"]
        XAIAPI["xAI API<br/>Grok (ツール呼び出し用)"]
        GoogleAPI["Google API<br/>検索/Drive"]
    end

    subgraph DataStore["💾 Data Store"]
        SessionDB[(Session DB<br/>SQLite/Postgres)]
        FileStore[(File Storage<br/>一時ファイル)]
    end

    %% フロントエンド → API層
    Sidebar --> Router
    DeepRToggle --> Router
    ChatUI --> Router

    %% ルーティング分岐
    Router -->|DeepR=ON| AgentChat
    Router -->|DeepR=OFF| GrokStream

    %% Agent API接続
    AgentChat --> OpenAIEndpoint
    AgentStream --> SessionMgr
    AgentBuffer --> SessionDB

    %% セッション管理
    SessionMgr --> SessionDB
    OpenAIEndpoint --> SessionMgr

    %% ツール実行
    SessionMgr --> ToolRegistry
    ToolRegistry --> WebSearch
    ToolRegistry --> TodoWrite
    ToolRegistry --> Bash
    ToolRegistry --> GDrive
    ToolRegistry --> XSearch
    ToolRegistry --> GrokSearch

    %% 外部API呼び出し
    SessionMgr -->|Claude API| ClaudeAPI
    WebSearch --> GoogleAPI
    XSearch -->|ツール実行| XAIAPI
    GrokSearch -->|ツール実行| XAIAPI
    GDrive --> GoogleAPI
    Bash --> FileStore

    %% UI連携
    ToolRegistry -->|ツール実行状態| ToolIndicator
    TodoWrite -->|タスク更新| TaskList
```

### 2.2 Deep Research ON/OFF フロー比較

```mermaid
sequenceDiagram
    actor User as ユーザー
    participant UI as チャットUI
    participant Toggle as DeepRトグル
    participant Router as API Router
    participant Agent as Agent API
    participant Grok as Grok API
    participant Claude as Claude API
    participant XAI as xAI API (ツール)

    %% Deep Research ON フロー
    rect rgb(230, 245, 255)
        Note over User,Claude: Deep Research = ON (詳細調査モード)
        User->>UI: メッセージ送信
        UI->>Toggle: 状態確認
        Toggle-->>UI: deepResearch=true
        UI->>Router: POST /api/agent/chat
        Router->>Agent: SSE接続開始
        Agent->>Claude: Claude Code呼び出し
        
        Note right of Agent: ツール使用判断
        
        alt Web検索が必要
            Agent->>Claude: WebSearchツール実行
        else X検索が必要
            Agent->>XAI: x_searchツール呼び出し
            XAI-->>Agent: X検索結果
        else タスク管理が必要
            Agent->>Claude: TodoWrite実行
            Claude-->>UI: タスクリスト更新
        end
        
        Agent->>Claude: 結果を基に継続思考
        Claude-->>Agent: 最終応答
        Agent-->>Router: SSEストリーム
        Router-->>UI: 逐次表示
    end

    %% Deep Research OFF フロー
    rect rgb(255, 245, 230)
        Note over User,Grok: Deep Research = OFF (高速応答モード)
        User->>UI: メッセージ送信
        UI->>Toggle: 状態確認
        Toggle-->>UI: deepResearch=false
        UI->>Router: POST /api/llm/stream
        Router->>Grok: Grok API直接呼び出し
        Grok-->>Router: 即座に応答
        Router-->>UI: ストリーム表示
    end
```

### 2.3 ツール実行フロー（Agent API内部）

```mermaid
sequenceDiagram
    participant Client as Teddy Client
    participant Agent as Agent API
    participant Claude as Claude API
    participant ToolExec as Tool Executor
    participant XAI as xAI API
    participant External as 外部サービス

    Client->>Agent: POST /v1/chat/completions
    Agent->>Claude: messages + tools定義
    
    loop ツール実行が必要な間
        Claude-->>Agent: tool_useリクエスト
        
        alt x_search ツール
            Agent->>ToolExec: x_search(query)
            ToolExec->>XAI: API呼び出し<br/>tools=[x_search]
            XAI-->>ToolExec: X検索結果
            ToolExec-->>Agent: 整形済み結果
        else grok_web_search ツール
            Agent->>ToolExec: grok_web_search(query)
            ToolExec->>XAI: API呼び出し<br/>tools=[web_search]
            XAI-->>ToolExec: 検索結果
            ToolExec-->>Agent: 整形済み結果
        else WebSearch ツール
            Agent->>ToolExec: WebSearch(query)
            ToolExec->>External: Google検索
            External-->>ToolExec: 検索結果
            ToolExec-->>Agent: 整形済み結果
        else TodoWrite ツール
            Agent->>ToolExec: TodoWrite(tasks)
            ToolExec-->>Agent: タスク更新通知
            Agent-->>Client: SSE: tool_call_todo
        end
        
        Agent->>Claude: ツール結果を追加
    end
    
    Claude-->>Agent: 最終応答
    Agent-->>Client: SSE完了
```

### 2.4 セッション管理アーキテクチャ

```mermaid
stateDiagram-v2
    [*] --> 初期化: 新規チャット
    
    初期化 --> 接続中: POST /chat/completions
    
    接続中 --> ツール実行中: tool_use検出
    接続中 --> 応答完了: 通常応答
    
    ツール実行中 --> 待機中: ツール結果待ち
    待機中 --> 接続中: 結果を送信
    
    接続中 --> 切断: エラー/タイムアウト
    接続中 --> 再接続待機: クライアント切断
    
    再接続待機 --> 接続中: GET /sessions/:id/stream
    
    応答完了 --> 接続中: 継続会話
    応答完了 --> 終了: セッション終了
    切断 --> 終了: エラー記録
    
    終了 --> [*]
```

### 2.5 データフロー図

```mermaid
flowchart LR
    subgraph Input["📥 Input Layer"]
        UserInput["ユーザー入力"]
        SystemPrompt["システムプロンプト"]
        FunctionDef["関数定義<br/>ツールスキーマ"]
    end

    subgraph Processing["⚙️ Processing Layer"]
        ClaudeEngine["Claude Code<br/>思考エンジン"]
        ToolRouter["ツールルーター"]
        
        subgraph ToolExecution["ツール実行層"]
            XSearch["x_search<br/>X(Twitter)"]
            WebSearch["WebSearch<br/>Google"]
            BashExec["Bash<br/>コマンド"]
            TodoMgr["TodoWrite<br/>タスク管理"]
        end
    end

    subgraph External["🌐 External Layer"]
        XAI["xAI API"]
        Google["Google APIs"]
        FileSystem["ファイルシステム"]
    end

    subgraph Output["📤 Output Layer"]
        SSEStream["SSEストリーム"]
        TaskUpdate["タスク更新"]
        FileOutput["ファイル出力"]
    end

    UserInput --> ClaudeEngine
    SystemPrompt --> ClaudeEngine
    FunctionDef --> ClaudeEngine
    
    ClaudeEngine -->|ツールが必要| ToolRouter
    ToolRouter -->|X検索| XSearch
    ToolRouter -->|Web検索| WebSearch
    ToolRouter -->|コマンド| BashExec
    ToolRouter -->|タスク| TodoMgr
    
    XSearch --> XAI
    WebSearch --> Google
    BashExec --> FileSystem
    
    XAI -->|結果| XSearch
    Google -->|結果| WebSearch
    FileSystem -->|結果| BashExec
    
    XSearch -->|結果| ClaudeEngine
    WebSearch -->|結果| ClaudeEngine
    BashExec -->|結果| ClaudeEngine
    TodoMgr -->|通知| TaskUpdate
    
    ClaudeEngine --> SSEStream
    BashExec --> FileOutput
```

---

## 3. 詳細設計

### 3.1 Agent APIの拡張（xAI連携）

Agent API（FastAPI）にxAI APIを呼び出すツールを追加する。

```python
# Agent API側のツール定義
TOOLS = {
    # 既存のClaude Codeツール
    "WebSearch": web_search_tool,
    "TodoWrite": todo_write_tool,
    "Bash": bash_tool,
    "gdrive_upload_file": gdrive_tool,
    
    # 新規: xAI連携ツール
    "x_search": {
        "description": "X（Twitter）検索 - リアルタイムSNS情報取得",
        "execute": lambda query: call_xai_api({
            "model": "grok-4-1-fast-reasoning",
            "tools": [{"type": "x_search"}],
            "input": [{"role": "user", "content": query}]
        })
    },
    "grok_web_search": {
        "description": "Grok Web検索 - 必要に応じて使用",
        "execute": lambda query: call_xai_api({
            "model": "grok-4-1-fast-reasoning",
            "tools": [{"type": "web_search"}],
            "input": [{"role": "user", "content": query}]
        })
    }
}
```

### 3.2 一般チャットのDeep Research設定

```typescript
// UIコンポーネント
interface ChatConfig {
  deepResearch: boolean;  // ON: Claude Code, OFF: Grok直接
}

// リクエスト先の分岐
if (deepResearch) {
  // Deep Research ON: Claude Code（詳細調査・ツール使用）
  return fetch('/api/agent/chat', {
    body: JSON.stringify({
      messages,
      enable_tools: true,
      reasoning_effort: 'high'  // 深く考える
    })
  });
} else {
  // Deep Research OFF: Grok直接（軽量・高速）
  return fetch('/api/llm/stream', {
    body: JSON.stringify({
      messages,
      provider: 'grok-4-1-fast-reasoning'
    })
  });
}
```

### 3.3 プロンプト設計

```markdown
## ツール使用ガイドライン

### 基本方針
あなたは高度なリサーチアシスタントです。必要に応じて以下のツールを使用してください。

### ツール選択基準

| 状況 | 使用ツール | 理由 |
|------|-----------|------|
| Web検索（一般） | WebSearch | 標準的なWeb検索 |
| X（Twitter）検索 | **x_search** | リアルタイムSNS情報はX検索が最適 |
| X検索が必要なWeb検索 | **grok_web_search** | Grokの自動閲覧機能を活用 |
| タスク管理 | TodoWrite | 進捗可視化 |
| ファイル保存 | gdrive_upload_file | 成果物保存 |
| Python実行 | Bash | データ分析等 |

### 特記事項
- **X検索が必要な場合は必ず x_search を優先して使用**
- x_searchとWebSearchは組み合わせて使用可能
- Grok（xAI）のツールを使用する際は、その結果を自分の言葉で整理して出力
```

---

## 4. セキュリティ設計

### 4.1 脅威モデルとリスク評価

| 脅威 | リスクレベル | 影響 | 対策 |
|------|-------------|------|------|
| APIキー流出 | 中 | 金銭的被害（月数万円程度） | Secrets Manager + IP制限 + API Key認証 |
| 不正アクセス | 中 | サービス悪用 | IP制限 + API Key認証 + レート制限 |
| データ流出 | 低 | 個人情報なし、業務情報のみ | VPC分離は不要、HTTPS必須 |
| DDoS | 低 | サービス停止 | ALB + ECSの自動スケーリング |

**判断**: Teddyは個人情報を扱わず、APIキー流出の影響は「即座に無効化できる金銭的被害」のみ。VPC閉じる必要なし。

### 4.2 セキュリティ対策（推奨レベル）

本番環境では以下の4層防御を採用する：

```
[Teddy@Vercel] ──HTTPS──▶ [ALB] ──▶ [Security Group] ──▶ [ECS Fargate]
                              │                              │
                              ▼ ① IP制限                     ▼ ② API Key認証
                        (Vercel IPのみ)                 (Shared Secret)
                                                               │
                                                               ▼ ③ レート制限
                                                          [Agent API]
                                                               │
                                                               ▼ ④ Secrets Manager
                                                          [Claude Code]
```

#### 対策①: IP制限（Security Group）

```hcl
# Terraform
resource "aws_security_group_rule" "allow_vercel_only" {
  type        = "ingress"
  from_port   = 8230
  to_port     = 8230
  protocol    = "tcp"
  cidr_blocks = ["76.76.21.0/24"]  # VercelのIPレンジ
}
```

#### 対策②: API Key認証（二重チェック）

```python
# Agent API側
from fastapi import HTTPException, Header
import os

AGENT_API_SECRET = os.environ["AGENT_API_SECRET"]

async def verify_auth(x_api_key: str = Header(...)):
    if x_api_key != AGENT_API_SECRET:
        raise HTTPException(401, "Invalid API key")
```

```typescript
// Teddy側
const response = await fetch('/api/agent/chat', {
  headers: {
    'X-API-Key': process.env.AGENT_API_SECRET!
  }
});
```

#### 対策③: レート制限

```python
# slowapi等で実装
from slowapi import Limiter

limiter = Limiter(key_func=lambda: "global")

@app.post("/v1/chat/completions")
@limiter.limit("100/minute")
async def chat_completions(request: Request):
    ...
```

#### 対策④: Secrets Manager管理

```hcl
# Terraform
resource "aws_secretsmanager_secret" "agent_api_keys" {
  name = "teddy/agent-api-keys"
}

resource "aws_secretsmanager_secret_version" "agent_api_keys" {
  secret_id = aws_secretsmanager_secret.agent_api_keys.id
  secret_string = jsonencode({
    ANTHROPIC_API_KEY = var.anthropic_api_key
    XAI_API_KEY       = var.xai_api_key
    AGENT_API_SECRET  = var.agent_api_secret
  })
}
```

### 4.3 インシデント対応手順

**APIキー流出が疑われた場合:**

1. **即座の対応（5分以内）**
   ```bash
   # AWS Secrets Managerでキーをローテーション
   aws secretsmanager rotate-secret --secret-id teddy/agent-api-keys
   ```

2. **影響確認**
   - Anthropic Dashboard: 不審な使用量の確認
   - xAI Dashboard: 同様

3. **復旧**
   - 新しいキーをTeddyの環境変数に設定
   - 古いキーを無効化

### 4.4 セキュリティ監視

| 監視項目 | ツール | アラート条件 |
|---------|--------|-------------|
| リクエスト数 | CloudWatch | 1時間に1000件超過 |
| エラーレート | CloudWatch | 5xxエラーが10%超過 |
| キーアクセス | CloudTrail | Secrets Managerへのアクセス |
| コスト | AWS Billing | 月額$100超過 |

---

## 5. UI/UX設計

### 5.1 サイドバー（変更なし・統合済み）

既存のサイドバーメニューをそのまま使用。裏側のエンジンがClaude Codeに変更される。

```
Sidebar
├── チャット（一般）
│   └── Deep Research [ON/OFF]  ← 新規トグルボタン
├── 出演者リサーチ（Claude Code）
├── エビデンスリサーチ（Claude Code）
├── 議事録作成（Claude Code - 軽量）
├── 新企画立案（Claude Code）
└── 履歴
```

### 5.2 Deep Researchトグルボタン

```tsx
// components/chat/DeepResearchToggle.tsx
export function DeepResearchToggle({ 
  enabled, 
  onChange 
}: { 
  enabled: boolean; 
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">
        {enabled ? '🧠 Deep Research' : '⚡ クイック回答'}
      </span>
      <Switch 
        checked={enabled}
        onCheckedChange={onChange}
      />
      <Tooltip content={enabled 
        ? "Claude Codeが詳細に調査・複数ツールを使用" 
        : "Grokが即座に回答（軽量・高速）"
      } />
    </div>
  );
}
```

### 5.3 表示切り替え

| モード | 表示 | 応答時間 | ツール使用 |
|--------|------|---------|-----------|
| **Deep Research ON** | 🤔 思考中... → 🔍 検索... → ✓ 完了 | 30秒〜5分 | 積極的に使用 |
| **Deep Research OFF** | 即座に回答 | 1〜5秒 | なし（または最小限） |

---

## 6. 実装タスク（Claude Codeメイン版）

> **前提**: 全工程でClaude Codeを使用。人間は指示出し・レビュー・テスト・軽微な修正のみ。

### 6.1 Claude Code活用ガイドライン

```
✅ 効率が良い使い方:
   - 参考実装を提示して「これと同じように」指示
   - 1ファイルずつ生成（まとめてだと品質が落ちる）
   - 型定義・エラーハンドリングを先に決める
   - テストケースを先に書いてもらい、実装は後

⚠️ 注意が必要な箇所:
   - SSEストリーミングの変換ロジック（複雑）
   - Terraformの既存環境との整合（ID等）
   - セキュリティ関連（人間が必ずレビュー）

💡 工数短縮のコツ:
   - プロンプトに「参考: docs/plans/claude-code-agent-integration-plan.md」と入れる
   - 生成後は必ず型チェック・ビルド・テスト
   - エラーが出たらログを渡して修正依頼
```

---

### Phase 1: Agent APIセットアップ + セキュリティ基盤 + xAI連携（1日）

| # | タスク | 詳細 | Claude Code | 人間 | 計 |
|---|--------|------|:-----------:|:----:|:--:|
| 1.1 | **xAI連携ツール追加** | `x_search`, `grok_web_search` 実装 | 1h | 0.5h(レビュー) | **1.5h** |
| 1.2 | **Railwayデプロイ設定** | Dockerfile, railway.yml作成 | 0.5h | 0.5h(動作確認) | **1h** |
| 1.3 | **セキュリティ実装** | Basic認証, IP制限設定 | 0.5h | 0.5h(レビュー) | **1h** |
| 1.4 | 接続テスト | Agent API ↔ xAI API疎通 | - | 1h(テスト) | **1h** |
| | **小計** | | **2h** | **2.5h** | **4.5h** |

**Phase 1合計: 約4.5時間（0.5日）**

---

### Phase 2: Teddy API実装（1日）

| # | タスク | 詳細 | Claude Code | 人間 | 計 |
|---|--------|------|:-----------:|:----:|:--:|
| 2.1 | **`/api/agent/chat`** | Agent API Proxy実装 | 1h | 0.5h(レビュー) | **1.5h** |
| 2.2 | **`/api/agent/sessions/[id]/stream`** | SSE Proxy実装 | 1h | 0.5h(レビュー) | **1.5h** |
| 2.3 | **SSE変換ロジック** | Agent API形式 → Teddy形式 | 1h | 1h(複雑なため) | **2h** |
| 2.4 | **エラーハンドリング** | 両APIのエラー統合 | 0.5h | 0.5h(レビュー) | **1h** |
| | **小計** | | **3.5h** | **2.5h** | **6h** |

**Phase 2合計: 約6時間（1日）**

---

### Phase 3: フロントエンド統合（1日）

| # | タスク | 詳細 | Claude Code | 人間 | 計 |
|---|--------|------|:-----------:|:----:|:--:|
| 3.1 | **Deep Researchトグル** | ON/OFFボタン実装 | 0.5h | 0.5h(レビュー) | **1h** |
| 3.2 | **API分岐ロジック** | DeepR状態でAPI先切り替え | 0.5h | 0.5h(レビュー) | **1h** |
| 3.3 | **`useAgentStream`フック** | Agent API用カスタムフック | 1h | 0.5h(レビュー) | **1.5h** |
| 3.4 | **ToolCallIndicator** | ツール実行状態表示コンポーネント | 0.5h | 0.5h(レビュー) | **1h** |
| 3.5 | **TaskList** | TodoWrite連携コンポーネント | 0.5h | 0.5h(レビュー) | **1h** |
| | **小計** | | **3h** | **2.5h** | **5.5h** |

**Phase 3合計: 約5.5時間（1日）**

---

### Phase 4: 既存機能移行（0.5日）

| # | タスク | 詳細 | Claude Code | 人間 | 計 |
|---|--------|------|:-----------:|:----:|:--:|
| 4.1 | **出演者リサーチ移行** | Grok → Agent API切り替え | 0.5h | 0.5h(テスト) | **1h** |
| 4.2 | **エビデンスリサーチ移行** | Grok → Agent API切り替え | 0.5h | 0.5h(テスト) | **1h** |
| 4.3 | **新企画立案移行** | Grok → Agent API切り替え | 0.5h | 0.5h(テスト) | **1h** |
| 4.4 | **議事録作成移行** | Grok → Agent API（軽量設定） | 0.5h | 0.5h(テスト) | **1h** |
| | **小計** | | **2h** | **2h** | **4h** |

**Phase 4合計: 約4時間（0.5日）**

---

### Phase 5: 統合テスト（0.5日）

| # | タスク | 詳細 | Claude Code | 人間 | 計 |
|---|--------|------|:-----------:|:----:|:--:|
| 5.1 | **Deep Research ON/OFFテスト** | 両モードの動作確認 | - | 1.5h | **1.5h** |
| 5.2 | **x_search連携テスト** | X検索→結果表示の確認 | - | 1h | **1h** |
| 5.3 | **全機能E2Eテスト** | 各機能のエンドツーエンド | 0.5h(テスト生成) | 1h | **1.5h** |
| | **小計** | | **0.5h** | **3.5h** | **4h** |

**Phase 5合計: 約4時間（0.5日）**

---

## 工数サマリー

| Phase | 内容 | Claude Code | 人間 | 合計 |
|-------|------|:-----------:|:----:|:----:|
| 1 | Agent API + xAI連携 | 2h | 2.5h | **4.5h** |
| 2 | Teddy API実装 | 3.5h | 2.5h | **6h** |
| 3 | フロントエンド統合 | 3h | 2.5h | **5.5h** |
| 4 | 既存機能移行 | 2h | 2h | **4h** |
| 5 | 統合テスト | 0.5h | 3.5h | **4h** |
| | **合計** | **11h** | **13h** | **24h（3日）** |

**Claude Codeメイン開発で従来の8日→3日に短縮（約60%削減）**

---

## 7. 技術仕様

### 7.1 環境変数

```bash
# Teddy側 (Vercel)
AGENT_API_URL=http://localhost:8230
AGENT_API_TIMEOUT=600000
AGENT_API_SECRET=shared-secret-key-32char-min  # セキュリティ対策②: API Key認証

# Agent API側 (Railway)
# Railway Dashboardで設定
ANTHROPIC_API_KEY=sk-ant-xxx
XAI_API_KEY=xai-xxx  # 新規: xAI連携用
AGENT_API_SECRET=shared-secret-key-32char-min
```

### 7.2 新規作成ファイル

```
app/
├── api/
│   ├── agent/
│   │   ├── chat/route.ts           # Claude Code生成
│   │   └── sessions/[sessionId]/
│   │       ├── stream/route.ts     # Claude Code生成
│   │       └── buffer/route.ts     # Claude Code生成
│   └── llm/
│       └── stream/route.ts（既存、変更なし）
├── hooks/
│   └── useAgentStream.ts           # Claude Code生成
└── components/
    ├── chat/
    │   ├── DeepResearchToggle.tsx  # Claude Code生成
    │   ├── ToolCallIndicator.tsx   # Claude Code生成
    │   └── TaskList.tsx            # Claude Code生成
    └── sidebar/
        └── AgentSelector.tsx（変更なし、裏側変更）

agent/（Claude Codeで改修）
├── src/
│   ├── main.py
│   └── tools/
│       └── xai_tools.py            # xAI連携ツール（Claude Code生成）
├── Dockerfile                      # Claude Code生成
└── railway.yml                     # Claude Code生成
```

---

## 8. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| Agent API停止 | 高 | Docker自動再起動、ヘルスチェック |
| xAI APIレート制限 | 中 | リトライロジック、フォールバック（WebSearch） |
| Claude Code生成コードの品質 | 中 | 人間レビュー必須、テスト駆動 |
| SSEストリーミングの複雑性 | 中 | 段階的実装、十分なテスト |
| セッション消失 | 中 | バッファリング、再接続対応 |

---

## 9. 今後の拡張

| 拡張 | 優先度 | 説明 |
|------|--------|------|
| neta-researcher完全移植 | 高 | 画像収集、インフォグラフィック等 |
| Google Drive統合 | 高 | MCP連携で完全なファイル管理 |
| 複数Agent切り替えUI | 中 | ユーザーが手動でGrok↔Claude切り替え |
| 自動モード選択 | 低 | AIが質問内容で最適なエンジンを自動選択 |

---

## 10. 参考リンク

- **Agent API実装**: [`reference/up-web-legacy/agent/`](/reference/up-web-legacy/agent/)
- **United Productions API Proxy**: [`reference/up-web-legacy/up_web/app/api/chat/completions/route.ts`](/reference/up-web-legacy/up_web/app/api/chat/completions/route.ts)
- **Claude Agent SDK**: https://github.com/anthropics/claude-agent-sdk
- **neta-researcher移植検討**: [`/docs/backlog/research-neta-researcher-porting.md`](/docs/backlog/research-neta-researcher-porting.md)
- **Teddy Grok実装**: [`lib/llm/clients/grok.ts`](/lib/llm/clients/grok.ts)

---

## 11. 更新履歴

| 日付 | 更新内容 |
|------|---------|
| 2026-03-07 | 初版作成 |
| 2026-03-07 | **大幅改訂**: 既存機能移行方針に変更、Deep Researchトグル追加、Claude↔Grok連携設計を追加 |
| 2026-03-07 | **マーメイド図追加**: システム構成図、シーケンス図、状態遷移図、データフロー図を追加 |
| 2026-03-07 | **セキュリティ設計追加**: AWS ECS推奨構成、4層防御、インシデント対応手順を追加 |
| 2026-03-07 | **工数見直し**: Claude Codeメイン開発前提で従来の8日→3日に短縮 |
