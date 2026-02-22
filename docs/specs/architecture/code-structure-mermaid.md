# AI Hub (Teddy) - コード構造概説（Mermaid版）

> **最終更新**: 2026-02-22 00:20

このドキュメントは、AI Hub（Teddy）アプリケーションのコード構造をMermaidダイアグラムで視覚化したものです。

---

## 目次

1. [全体アーキテクチャ（概要）](#1-全体アーキテクチャ概要)
2. [レイヤー構成詳細](#2-レイヤー構成詳細)
3. [認証フロー](#3-認証フロー)
4. [チャット機能の流れ](#4-チャット機能の流れ)
5. [Gem（機能別チャット）システム](#5-gem機能別チャットシステム)
6. [コンポーネント階層](#6-コンポーネント階層)
7. [データベーススキーマ](#7-データベーススキーマ)
8. [ファイル依存関係](#8-ファイル依存関係)

---

## 1. 全体アーキテクチャ（概要）

```mermaid
graph TB
    subgraph "【ブラウザ】ユーザーが見る画面"
        U["👤 ユーザー"]
    end

    subgraph "【Frontend】Next.js App Router"
        direction TB
        PAGES["📄 ページ層<br/>app/"]
        COMPS["🧩 コンポーネント層<br/>components/"]
        HOOKS["⚡ カスタムフック層<br/>hooks/"]
    end

    subgraph "【Backend】lib/ ライブラリ"
        direction TB
        AUTH["🔐 認証・DB層"]
        LLM["🤖 LLM統合層"]
        PROMPT["📝 プロンプト管理層"]
    end

    subgraph "【外部サービス】"
        DB["🗄️ PostgreSQL<br/>(Neon)"]
        CACHE["⚡ Redis<br/>(Upstash)"]
        XAI["🧠 xAI API<br/>(Grok)"]
    end

    U -->|"HTTPリクエスト"| PAGES
    PAGES -->|"インポート"| COMPS
    COMPS -->|"状態管理・副作用"| HOOKS
    HOOKS -->|"API呼び出し"| AUTH
    HOOKS -->|"API呼び出し"| LLM
    LLM -->|"SQL実行"| AUTH
    AUTH -->|"接続"| DB
    LLM -->|"REST API"| XAI
```

### 図の説明

| レイヤー | 役割 | 主要ディレクトリ |
|---------|------|----------------|
| Frontend | ユーザーインターフェース | `app/`, `components/`, `hooks/` |
| Backend | ビジネスロジック | `lib/` |
| 外部サービス | データ永続化・AI処理 | PostgreSQL, Redis, xAI API |

---

## 2. レイヤー構成詳細

### 2.1 ページ層（app/）

```mermaid
graph LR
    subgraph "【ページ層】app/"
        direction TB

        subgraph "認証必須エリア"
            AUTH["📁 (authenticated)/"]
            AUTH --> CHAT["💬 chat/<br/>一般チャット"]
            AUTH --> RESEARCH["🔍 research/<br/>リサーチ機能"]
            AUTH --> MINUTES["📋 minutes/<br/>議事録作成"]
            AUTH --> PROPOSAL["💡 proposal/<br/>新企画立案"]
            AUTH --> NASCRIPT["🎤 na-script/<br/>NA原稿"]
            AUTH --> SETTINGS["⚙️ settings/<br/>番組設定"]
        end

        subgraph "APIエンドポイント"
            API["📁 api/"]
            API --> AUTH_API["🔐 auth/<br/>NextAuth.js"]
            API --> LLM_API["🤖 llm/<br/>LLMストリーミング"]
            API --> CHAT_API["💾 chat/<br/>履歴保存"]
            API --> DRIVE_API["📂 drive/<br/>Google Drive"]
        end

        subgraph "認証不要エリア"
            PUB["📁 (public)/"]
            PUB --> SIGNIN["🔑 auth/signin/<br/>ログイン画面"]
        end
    end
```

**ファイルの役割:**
- `(authenticated)/layout.tsx` → ログイン必須。未ログイン時は/signinへリダイレクト
- `(public)/layout.tsx` → ログイン不要。ログイン画面で使用
- `api/*` → クライアントから呼ばれるバックエンドAPI

---

### 2.2 コンポーネント層（components/）

```mermaid
graph TB
    subgraph "【コンポーネント層】components/"
        direction TB

        LAYOUT["📁 layout/<br/>レイアウト関連"]
        LAYOUT --> APPLAYOUT["AppLayout.tsx<br/>├─ 全体レイアウト構造<br/>├─ Sidebar配置<br/>└─ メインコンテンツ領域"]
        LAYOUT --> SIDEBAR["Sidebar.tsx<br/>├─ 新規作成ボタン群<br/>├─ 履歴リンク<br/>├─ ログアウト<br/>└─ 折りたたみ機能"]

        UI["📁 ui/<br/>UIコンポーネント"]
        UI --> FEATURE["FeatureChat.tsx<br/>├─ メッセージ表示<br/>├─ 入力処理<br/>├─ ファイル添付<br/>└─ ストリーミング表示"]
        UI --> STREAM["StreamingMessage.tsx<br/>├─ リアルタイム表示<br/>├─ 思考プロセス<br/>├─ ツール呼び出し<br/>└─ トークン使用量"]
        UI --> BUBBLE["MessageBubble.tsx<br/>└─ 個別メッセージ表示"]
        UI --> INPUT["ChatInputArea.tsx<br/>└─ 入力フォーム"]

        CHAT["📁 chat/<br/>チャット専用"]
        CHAT --> CHATPAGE["ChatPage.tsx<br/>└─ Gem（機能）切り替え管理"]
    end

    APPLAYOUT --> SIDEBAR
    FEATURE --> STREAM
    FEATURE --> BUBBLE
    FEATURE --> INPUT
```

**ファイルの役割:**
- `AppLayout.tsx` → 認証済みページの共通レイアウト（Sidebar + メイン領域）
- `Sidebar.tsx` → 左側のナビゲーション。新規作成ボタン8つ + 履歴 + ログアウト
- `FeatureChat.tsx` → 各機能のチャットUI本体。メッセージの表示・入力・保存を担当
- `StreamingMessage.tsx` → AIの返答をリアルタイムで表示。思考プロセスやツール使用状況も表示

---

### 2.3 カスタムフック層（hooks/）

```mermaid
graph LR
    subgraph "【カスタムフック層】hooks/"
        direction TB

        USECONV["useConversationSave.ts<br/>├─ 会話履歴の読み込み<br/>├─ 会話履歴の保存<br/>└─ chatId管理"]

        USELLM["useLLM.ts<br/>├─ LLM API呼び出し<br/>└─ レスポンス処理"]

        USESTREAM["useLLMStream.ts<br/>├─ ストリーミング制御<br/>├─ リアルタイム表示更新<br/>└─ エラーハンドリング"]

        USEFILE["useFileUpload.ts<br/>├─ ファイル選択<br/>├─ アップロード処理<br/>└─ プレビュー表示"]

        USEDRIVE["useGoogleDrive.ts<br/>├─ Driveファイル一覧取得<br/>└─ ファイル選択"]
    end
```

**ファイルの役割:**
- `useConversationSave.ts` → チャット履歴の保存と読み込みを担当
- `useLLMStream.ts` → AIからのストリーミングレスポンスを管理
- `useFileUpload.ts` → ファイル添付機能
- `useGoogleDrive.ts` → Google Drive連携

---

### 2.4 バックエンド層（lib/）

```mermaid
graph TB
    subgraph "【バックエンド層】lib/"
        direction TB

        subgraph "認証・DB"
            AUTHOPTS["auth-options.ts<br/>├─ Google OAuth設定<br/>├─ JWT戦略<br/>└─ セッション管理"]
            PRISMA["prisma.ts<br/>├─ Prisma Client初期化<br/>├─ 接続プール管理<br/>└─ 開発環境対応"]
            AUTHUTIL["api/auth.ts<br/>└─ 認証チェックユーティリティ"]
        end

        subgraph "LLM統合 lib/llm/"
            LLMTYPES["types.ts<br/>└─ 型定義<br/>  (LLMProvider, LLMMessage等)"]
            LLMCONFIG["config.ts<br/>└─ プロバイダー設定<br/>  (価格、制限、デフォルト)"]
            LLMFACTORY["factory.ts<br/>└─ LLMクライアント生成"]

            subgraph "LangChain実装"
                LC_ADAPTER["langchain/adapter.ts<br/>└─ LangChainラッパー"]
                LC_FACTORY["langchain/factory.ts<br/>└─ モデルインスタンス生成"]
                LC_STREAM["langchain/chains/streaming.ts<br/>└─ ストリーミング処理"]
            end
        end

        subgraph "プロンプト管理 lib/prompts/"
            PROMPTDB["db.ts<br/>├─ DBプロンプト取得<br/>├─ バージョン管理<br/>└─ デフォルト値"]
            GEMS["chat/gems.ts<br/>└─ 8機能のGem定義"]
        end
    end

    LLMFACTORY --> LC_ADAPTER
    LC_ADAPTER --> LC_FACTORY
    LC_FACTORY --> LC_STREAM
    GEMS --> PROMPTDB
```

**ファイルの役割:**
- `auth-options.ts` → NextAuth.jsの設定。Google OAuth、JWT戦略、セッション管理
- `prisma.ts` → データベース接続。開発環境でのホットリロード対応
- `lib/llm/factory.ts` → LLMクライアントを生成するファクトリ
- `lib/llm/langchain/*.ts` → LangChainを使ったLLM連携実装
- `lib/prompts/db.ts` → データベース管理のプロンプトを取得・更新
- `lib/chat/gems.ts` → 8つの機能別チャット（Gem）の定義

---

## 3. 認証フロー

### 3.1 シーケンス図

```mermaid
sequenceDiagram
    autonumber
    actor U as 👤 ユーザー
    participant Browser as 🌐 ブラウザ
    participant NextAuth as 🔐 NextAuth.js
    participant Google as 🔑 Google OAuth
    participant DB as 🗄️ PostgreSQL

    Note over U,DB: 【ログイン開始】

    U->>Browser: アプリにアクセス
    Browser->>NextAuth: 未認証を検知
    NextAuth-->>Browser: /auth/signin へリダイレクト

    Note over U,DB: 【Google認証】

    U->>Browser: 「Googleでログイン」クリック
    Browser->>Google: OAuth認証要求
    Google->>U: Googleログイン画面表示
    U->>Google: 認証情報入力
    Google-->>Browser: 認可コード返却

    Note over U,DB: 【セッション作成】

    Browser->>NextAuth: コールバック (/api/auth/callback/google)
    NextAuth->>Google: アクセストークン取得
    Google-->>NextAuth: トークン + ユーザー情報

    NextAuth->>DB: ユーザー検索/作成
    DB-->>NextAuth: ユーザーID返却

    NextAuth->>NextAuth: JWTトークン生成
    Note right of NextAuth: 含める情報:<br/>- userId<br/>- accessToken<br/>- refreshToken<br/>- expires_at

    NextAuth-->>Browser: セッションCookie設定
    Browser-->>U: ログイン完了、トップページ表示
```

### 3.2 認証状態の遷移

```mermaid
stateDiagram-v2
    [*] --> 未認証: アプリ初訪問
    未認証 --> 認証中: /auth/signinで<br/>「Googleでログイン」クリック
    認証中 --> 認証済: Google OAuth完了
    認証中 --> エラー: 認証失敗
    エラー --> 未認証: リトライ
    認証済 --> 未認証: ログアウト

    state 認証済 {
        [*] --> トークン有効
        トークン有効 --> トークン期限切れ: 30日経過
        トークン期限切れ --> トークン有効: 自動更新
    }
```

---

## 4. チャット機能の流れ

### 4.1 全体フロー概要

```mermaid
graph LR
    subgraph "【Phase 1】ユーザー入力"
        A1["👤 ユーザーが<br/>メッセージ入力"] --> A2["🧩 FeatureChat.tsx<br/>handleSend()実行"]
        A2 --> A3["状態更新<br/>messagesに追加"]
    end

    subgraph "【Phase 2】ストリーミング処理"
        B1["⚡ useLLMStream.ts<br/>startStream()呼び出し"] --> B2["🌐 /api/llm/stream<br/>APIコール"]
        B2 --> B3["🔧 lib/llm/langchain<br/>モデル生成"]
        B3 --> B4["🧠 xAI API<br/>SSE接続"]
    end

    subgraph "【Phase 3】リアルタイム表示"
        C1["文字チャンク受信"] --> C2["⚡ useLLMStream<br/>content更新"]
        C2 --> C3["🧩 FeatureChat<br/>再レンダリング"]
        C3 --> C4["👤 画面に即時反映"]
    end

    subgraph "【Phase 4】完了・保存"
        D1["✅ 完了信号受信"] --> D2["🧩 FeatureChat<br/>messages確定"]
        D2 --> D3["💾 useConversationSave<br/>saveConversation()"]
        D3 --> D4["🗄️ PostgreSQL<br/>履歴保存"]
    end

    A3 --> B1
    B4 --> C1
    C4 --> C1
    C1 -->|"完了時"| D1
```

---

### 4.2 詳細シーケンス：メッセージ送信からDB保存まで

```mermaid
sequenceDiagram
    autonumber
    actor U as 👤 ユーザー
    participant FC as 🧩 FeatureChat.tsx
    participant Hook as ⚡ useLLMStream.ts
    participant API as 🤖 /api/llm/stream
    participant Auth as 🔐 lib/api/auth.ts
    participant LLM as 🔧 lib/llm/langchain
    participant XAI as 🧠 xAI API
    participant Save as 💾 useConversationSave.ts
    participant DB as 🗄️ PostgreSQL

    Note over U,DB: ═══════════════════════════════════════
    Note over U,DB: 【Step 1】ユーザー入力処理
    Note over U,DB: ═══════════════════════════════════════

    U->>FC: 1. メッセージを入力
    U->>FC: 2. 「送信」ボタンクリック
    
    FC->>FC: 3. handleSend()関数実行
    Note right of FC: 入力値を取得<br/>添付ファイル処理

    FC->>FC: 4. ユーザーメッセージをmessages配列に追加
    Note right of FC: messages = [...messages, userMessage]<br/>→ 画面に即時表示

    FC->>FC: 5. 入力欄をクリア

    Note over U,DB: ═══════════════════════════════════════
    Note over U,DB: 【Step 2】LLMストリーミング開始
    Note over U,DB: ═══════════════════════════════════════

    FC->>Hook: 6. startStream(messages, provider)呼び出し
    Note right of Hook: provider = 'grok-4-1-fast-reasoning'<br/>など

    Hook->>Hook: 7. 状態をリセット
    Note right of Hook: content = ''<br/>isComplete = false<br/>error = null

    Hook->>API: 8. POST /api/llm/stream<br/>RequestBody: {messages, provider}

    API->>Auth: 9. requireAuth(request)呼び出し
    Auth-->>API: 10. ユーザー認証情報返却

    API->>API: 11. リクエストバリデーション<br/>Zodスキーマ検証

    API->>LLM: 12. createLangChainModel(provider)呼び出し
    Note right of LLM: LangChainモデル初期化<br/>temperature, maxTokens設定

    LLM->>XAI: 13. SSE (Server-Sent Events)<br/>接続開始
    Note right of XAI: ストリーミングレスポンス<br/>準備完了

    Note over U,DB: ═══════════════════════════════════════
    Note over U,DB: 【Step 3】リアルタイムレスポンス
    Note over U,DB: ═══════════════════════════════════════

    loop チャンク受信ループ（リアルタイム）
        XAI-->>LLM: 14a. 文字チャンク送信
        Note right of XAI: 例: "こ", "ん", "に", "ち", "は"

        LLM-->>API: 14b. 加工済みチャンク
        Note right of LLM: ツール呼び出し情報<br/>思考プロセスも含む

        API-->>Hook: 14c. SSE: data: {content: "..."}
        Note right of API: Content-Type: text/event-stream

        Hook->>Hook: 14d. content状態更新
        Note right of Hook: content += 受信チャンク

        Hook->>FC: 14e. 状態変更通知（React）

        FC->>FC: 14f. 再レンダリング
        FC->>U: 14g. 画面に新しい文字を追加表示
    end

    Note over U,DB: ═══════════════════════════════════════
    Note over U,DB: 【Step 4】完了処理
    Note over U,DB: ═══════════════════════════════════════

    XAI-->>LLM: 15. 完了信号 + 最終情報
    Note right of XAI: usage情報含む<br/>inputTokens, outputTokens, cost

    LLM-->>API: 16. 最終チャンク送信
    API-->>Hook: 17. SSE: data: {done: true, usage: {...}}

    Hook->>Hook: 18. isComplete = true
    Hook->>FC: 19. 完了通知

    FC->>FC: 20. アシスタントメッセージ確定
    Note right of FC: messages = [...messages, assistantMessage]<br/>contentをmessagesに統合

    Note over U,DB: ═══════════════════════════════════════
    Note over U,DB: 【Step 5】履歴保存
    Note over U,DB: ═══════════════════════════════════════

    FC->>Save: 21. saveConversation(messages, chatId)呼び出し

    Save->>DB: 22. POST /api/chat/feature<br/>{chatId, featureId, messages}
    Note right of DB: chatIdがない場合は<br/>新規チャット作成

    DB->>DB: 23. トランザクション実行
    Note right of DB: 1. researchChat作成/更新<br/>2. researchMessage全削除<br/>3. researchMessage再作成

    DB-->>Save: 24. 保存完了レスポンス<br/>{success: true, chatId}

    Save->>Save: 25. currentChatId状態更新

    Note over U,DB: ═══════════════════════════════════════
    Note over U,DB: 【Step 6】タイトル生成（初回のみ）
    Note over U,DB: ═══════════════════════════════════════

    alt 新規チャットの場合
        DB->>DB: 26a. バックグラウンドで<br/>タイトル生成開始
        Note right of DB: Grok API呼び出し<br/>最初のメッセージから要約
        DB->>DB: 26b. researchChat.title更新
    end

    Save-->>FC: 27. 保存完了
    FC->>U: 28. 完了！次の入力待ち
```

---

### 4.3 FeatureChatコンポーネントの内部構造

#### 【変更前】複雑なテキストを含むバージョン

```mermaid
graph TB
    subgraph "【FeatureChat.tsx】メインコンポーネント"
        direction TB

        FC["🧩 FeatureChat.tsx<br/>├─ 役割: チャットUI全体管理<br/>├─ 責務: メッセージ表示・入力・保存<br/>└─ 位置: components/ui/FeatureChat.tsx"]

        subgraph "【状態管理】useState"
            FC_STATE["React状態"]
            FC_STATE --> MESSAGES["📋 messages: Message[]<br/>├─ 全メッセージ一覧<br/>├─ user: ユーザーメッセージ<br/>└─ assistant: AI応答"]
            FC_STATE --> INPUT["✏️ input: string<br/>└─ 入力欄の現在値"]
            FC_STATE --> FILES["📎 attachedFiles: AttachedFile[]<br/>├─ 添付ファイル一覧<br/>├─ name: ファイル名<br/>├─ type: MIMEタイプ<br/>└─ content: ファイル内容"]
            FC_STATE --> COPIED["📋 isCopied: boolean<br/>└─ コピー完了表示用"]
        end

        subgraph "【関数】イベントハンドラ"
            FC_FUNC["メソッド"]
            FC_FUNC --> HANDLE_SEND["📤 handleSend()<br/>├─ トリガー: 送信ボタン<br/>├─ 処理: ファイル連結<br/>├─ 処理: messages追加<br/>└─ 呼出: startStream()"]
            FC_FUNC --> HANDLE_REGEN["🔄 handleRegenerate()<br/>├─ トリガー: 再生成ボタン<br/>├─ 処理: 最後のAI応答削除<br/>└─ 呼出: startStream()"]
            FC_FUNC --> HANDLE_CLEAR["🗑️ handleClear()<br/>├─ トリガー: クリアボタン<br/>├─ 処理: messages空に<br/>└─ 呼出: DB削除API"]
            FC_FUNC --> HANDLE_COPY["📋 handleCopy()<br/>├─ トリガー: コピーボタン<br/>└─ 処理: クリップボードにコピー"]
        end

        subgraph "【レンダリング】JSX"
            FC_RENDER["画面構成"]
            FC_RENDER --> R_HEADER["┌─ ChatHeader<br/>│  ├─ タイトル表示<br/>│  ├─ クリアボタン<br/>│  └─ コピーボタン"]
            FC_RENDER --> R_MESSAGES["├─ メッセージエリア<br/>│  ├─ MessageBubble[]<br/>│  ├─ StreamingMessage<br/>│  └─ PromptSuggestions"]
            FC_RENDER --> R_INPUT["└─ ChatInputArea<br/>   ├─ テキストエリア<br/>   ├─ ファイル添付<br/>   └─ 送信ボタン"]
        end
    end

    style FC fill:#e1f5ff,stroke:#333,stroke-width:2px
```

#### 【変更後】シンプルなサブグラフ版

```mermaid
graph TB
    subgraph "FeatureChat.tsx"
        direction TB
        
        FC_TITLE["🧩 FeatureChat.tsx<br/>チャットUI全体管理"]
        
        subgraph "状態管理 useState"
            ST_MSG["messages<br/>メッセージ一覧"]
            ST_INPUT["input<br/>入力値"]
            ST_FILES["attachedFiles<br/>添付ファイル"]
        end
        
        subgraph "イベントハンドラ"
            FN_SEND["handleSend()<br/>送信処理"]
            FN_REGEN["handleRegenerate()<br/>再生成"]
            FN_CLEAR["handleClear()<br/>クリア"]
        end
        
        subgraph "レンダリング JSX"
            UI_HEAD["ChatHeader<br/>ヘッダー"]
            UI_MSG["MessageBubble<br/>メッセージ表示"]
            UI_INPUT["ChatInputArea<br/>入力エリア"]
        end
    end
    
    FC_TITLE --> ST_MSG
    FC_TITLE --> FN_SEND
    FC_TITLE --> UI_HEAD
```

#### 【変更後】詳細は表形式で別記

| カテゴリ | 名前 | 型/戻り値 | 説明 |
|---------|------|----------|------|
| **状態** | `messages` | `Message[]` | 全メッセージ一覧（user/assistant） |
| **状態** | `input` | `string` | 入力欄の現在値 |
| **状態** | `attachedFiles` | `AttachedFile[]` | 添付ファイル（name, type, content） |
| **状態** | `isCopied` | `boolean` | コピー完了表示用 |
| **関数** | `handleSend()` | `void` | 送信ボタンクリック時。ファイル連結→messages追加→startStream()呼出 |
| **関数** | `handleRegenerate()` | `void` | 再生成ボタン。最後のAI応答削除→startStream()呼出 |
| **関数** | `handleClear()` | `void` | クリアボタン。messages空に→DB削除API呼出 |
| **関数** | `handleCopy()` | `void` | コピーボタン。クリップボードにコピー |
| **UI** | `ChatHeader` | コンポーネント | タイトル表示、クリア/コピーボタン |
| **UI** | `MessageBubble` | コンポーネント | 個別メッセージ表示 |
| **UI** | `StreamingMessage` | コンポーネント | AIのリアルタイム応答表示 |
| **UI** | `ChatInputArea` | コンポーネント | テキストエリア、ファイル添付、送信ボタン |

---

### 4.4 useLLMStreamフックの詳細

```mermaid
graph TB
    subgraph "【useLLMStream.ts】ストリーミング管理フック"
        direction TB

        HOOK["⚡ useLLMStream()<br/>├─ 役割: LLMストリーミング制御<br/>├─ 責務: リアルタイム表示・エラー処理<br/>└─ 位置: components/ui/StreamingMessage.tsx"]

        subgraph "【状態】返却値"
            HOOK_STATE["React状態"]
            HOOK_STATE --> CONTENT["📝 content: string<br/>├─ 現在表示中のAI応答<br/>├─ チャンク累積<br/>└─ StreamingMessageに表示"]
            HOOK_STATE --> THINKING["💭 thinking: string<br/>├─ AIの思考プロセス<br/>└─ 推論モデルのみ"]
            HOOK_STATE --> IS_COMPLETE["✅ isComplete: boolean<br/>├─ true: 完了済<br/>└─ false: 生成中"]
            HOOK_STATE --> ERROR["❌ error: string | null<br/>└─ エラーメッセージ"]
            HOOK_STATE --> TOOL_CALLS["🔧 toolCalls: ToolCallInfo[]<br/>├─ Web検索呼び出し<br/>├─ X検索呼び出し<br/>└─ コード実行等"]
            HOOK_STATE --> USAGE["📊 usage: UsageInfo<br/>├─ inputTokens: 入力トークン<br/>├─ outputTokens: 出力トークン<br/>└─ cost: 推定コスト(USD)"]
            HOOK_STATE --> REASONING["🧩 reasoningSteps: ReasoningStep[]<br/>├─ ステップ番号<br/>└─ 思考内容"]
        end

        subgraph "【関数】操作メソッド"
            HOOK_FUNC["返却関数"]
            HOOK_FUNC --> START["▶️ startStream(messages, provider)<br/>├─ 引数: messages配列<br/>├─ 引数: provider名<br/>├─ 処理: 状態リセット<br/>├─ 処理: API呼び出し<br/>└─ 戻り: Promise<void>"]
            HOOK_FUNC --> CANCEL["⏹️ cancelStream()<br/>├─ トリガー: キャンセルボタン<br/>├─ 処理: AbortController.abort()<br/>└─ 効果: 接続強制切断"]
            HOOK_FUNC --> RESET["🔄 resetStream()<br/>├─ トリガー: 完了後<br/>├─ 処理: 全状態初期化<br/>└─ 効果: 次の準備"]
        end

        subgraph "【内部処理】プライベート"
            HOOK_PRIVATE["内部実装"]
            HOOK_PRIVATE --> ABORT["🛑 abortControllerRef<br/>└─ AbortControllerインスタンス保持"]
            HOOK_PRIVATE --> PARSE["📡 SSEパース処理<br/>├─ event.data解析<br/>├─ content抽出<br/>├─ thinking抽出<br/>├─ toolCall抽出<br/>└─ usage抽出"]
        end
    end

    style HOOK fill:#fff4e1,stroke:#333,stroke-width:2px
```

---

### 4.5 useConversationSaveフックの詳細

```mermaid
graph TB
    subgraph "【useConversationSave.ts】履歴管理フック"
        direction TB

        SAVE["💾 useConversationSave(options)<br/>├─ 役割: チャット履歴の永続化<br/>├─ 責務: 読込・保存・chatId管理<br/>└─ 位置: hooks/useConversationSave.ts"]

        subgraph "【引数】options"
            SAVE_ARGS["パラメータ"]
            SAVE_ARGS --> ARG_FEATURE["featureId: string<br/>└─ 機能識別子<br/>  (例: 'RESEARCH_CAST')"]
            SAVE_ARGS --> ARG_CHAT_ID["initialChatId?: string<br/>└─ 初期チャットID<br/>  (指定時は履歴読込)"]
            SAVE_ARGS --> ARG_CALLBACK["onChatCreated?: (id) => void<br/>└─ 新規作成時コールバック"]
        end

        subgraph "【状態】返却値"
            SAVE_STATE["React状態"]
            SAVE_STATE --> CHAT_ID["🆔 currentChatId: string | undefined<br/>├─ 現在のチャットID<br/>├─ undefined: 新規未保存<br/>└─ 文字列: 既存チャット"]
            SAVE_STATE --> IS_LOADING["⏳ isLoadingHistory: boolean<br/>├─ true: 履歴読込中<br/>└─ false: 完了 or 新規"]
        end

        subgraph "【関数】操作メソッド"
            SAVE_FUNC["返却関数"]
            SAVE_FUNC --> LOAD["📖 loadConversation(chatId)<br/>├─ 引数: 読み込むchatId<br/>├─ API: GET /api/chat/feature?chatId=xxx<br/>├─ 戻り: Message[]<br/>└─ 用途: 初期表示時"]
            SAVE_FUNC --> SAVE_CONV["💾 saveConversation(messages, chatId)<br/>├─ 引数: 保存するmessages<br/>├─ 引数: 現在のchatId<br/>├─ API: POST /api/chat/feature<br/>├─ 効果: chatId発行 or 更新<br/>└─ 用途: メッセージ確定時"]
            SAVE_FUNC --> SET_ID["🆔 setCurrentChatId(id)<br/>└─ 直接chatIdを変更"]
        end

        subgraph "【API連携】バックエンド"
            SAVE_API["APIエンドポイント"]
            SAVE_API --> API_GET["GET /api/chat/feature<br/>├─ Query: chatId<br/>└─ Response: {messages}"]
            SAVE_API --> API_POST["POST /api/chat/feature<br/>├─ Body: {chatId, featureId, messages}<br/>├─ chatIdなし→新規作成<br/>├─ chatIdあり→更新<br/>└─ Response: {success, chatId}"]
            SAVE_API --> API_DELETE["DELETE /api/chat/feature<br/>├─ Query: chatId<br/>└─ チャット削除"]
        end
    end

    style SAVE fill:#e8f5e9,stroke:#333,stroke-width:2px
```

---

### 4.6 コンポーネント・フック間のデータフロー

```mermaid
graph TB
    subgraph "【データフロー図】"
        direction TB

        USER["👤 ユーザー操作"]

        subgraph "【Layer 1】UIコンポーネント"
            FC["🧩 FeatureChat.tsx"]
        end

        subgraph "【Layer 2】カスタムフック"
            STREAM["⚡ useLLMStream()"]
            SAVE["💾 useConversationSave()"]
        end

        subgraph "【Layer 3】APIクライアント"
            LLM_CLIENT["🔌 lib/api/llm-client.ts<br/>└─ streamLLMResponse()"]
            SAVE_CLIENT["🔌 hooks/useConversationSave.ts内<br/>└─ fetch()直接呼び出し"]
        end

        subgraph "【Layer 4】APIエンドポイント"
            LLM_API["🤖 /api/llm/stream<br/>└─ ストリーミングレスポンス"]
            SAVE_API["💾 /api/chat/feature<br/>└─ 履歴CRUD"]
        end

        subgraph "【Layer 5】バックエンド処理"
            LLM_BACKEND["🔧 lib/llm/langchain<br/>└─ モデル生成・ストリーミング"]
            SAVE_BACKEND["🗄️ prisma.ts<br/>└─ DB操作"]
        end

        subgraph "【Layer 6】外部サービス"
            XAI["🧠 xAI API (Grok)"]
            DB["🗄️ PostgreSQL"]
        end

        %% データフロー
        USER -->|"1. メッセージ入力<br/>2. 送信クリック"| FC

        FC -->|"A. startStream(messages, provider)"| STREAM
        FC -->|"B. saveConversation(messages, chatId)"| SAVE

        STREAM -->|"fetch SSE"| LLM_CLIENT
        SAVE -->|"fetch POST/GET"| SAVE_CLIENT

        LLM_CLIENT -->|"POST /api/llm/stream"| LLM_API
        SAVE_CLIENT -->|"POST /api/chat/feature"| SAVE_API

        LLM_API -->|"createLangChainModel"| LLM_BACKEND
        SAVE_API -->|"prisma.researchChat"| SAVE_BACKEND

        LLM_BACKEND -->|"SSE接続"| XAI
        SAVE_BACKEND -->|"SQL実行"| DB

        %% レスポンスフロー
        XAI -->|"文字チャンク<br/>リアルタイム"| LLM_BACKEND
        LLM_BACKEND -->|"加工済みチャンク"| LLM_API
        LLM_API -->|"SSE: data: {...}"| LLM_CLIENT
        LLM_CLIENT -->|"for await...of"| STREAM
        STREAM -->|"content更新<br/>isComplete更新"| FC
        FC -->|"画面表示更新"| USER

        DB -->|"保存完了"| SAVE_BACKEND
        SAVE_BACKEND -->|"{success, chatId}"| SAVE_API
        SAVE_API -->|"Response"| SAVE_CLIENT
        SAVE_CLIENT -->|"currentChatId更新"| SAVE
        SAVE -->|"保存完了"| FC
    end

    style FC fill:#e1f5ff,stroke:#333
    style STREAM fill:#fff4e1,stroke:#333
    style SAVE fill:#e8f5e9,stroke:#333
    style XAI fill:#f3e5f5,stroke:#333
    style DB fill:#ffebee,stroke:#333
```

---

### 4.7 状態遷移図：メッセージのライフサイクル

```mermaid
stateDiagram-v2
    [*] --> 入力待機: 初期表示

    state "入力待機" as IDLE {
        [*] --> 空欄
        空欄 --> 入力中: キー入力
        入力中 --> 空欄: 全削除
        入力中 --> 入力中: 追加入力
    }

    IDLE --> 送信中: Enter or 送信ボタン

    state "送信中" as SENDING {
        [*] --> ユーザーメッセージ表示
        ユーザーメッセージ表示 --> API呼び出し中: startStream()
    }

    SENDING --> ストリーミング中: SSE接続確立

    state "ストリーミング中" as STREAMING {
        [*] --> 文字受信中
        文字受信中 --> 文字受信中: 次のチャンク
        文字受信中 --> ツール呼び出し中: toolCall検出
        ツール呼び出し中 --> 文字受信中: 完了
        文字受信中 --> 思考中表示: thinking検出
        思考中表示 --> 文字受信中: 完了
    }

    STREAMING --> 完了: done信号受信

    state "完了" as COMPLETED {
        [*] --> メッセージ確定
        メッセージ確定 --> DB保存中: saveConversation()
        DB保存中 --> 保存完了: 成功
        DB保存中 --> 保存エラー: 失敗
    }

    COMPLETED --> 入力待機: 次の入力へ

    %% エラー遷移
    SENDING --> エラー: 認証エラー
    STREAMING --> エラー: 接続エラー
    COMPLETED --> エラー: DBエラー

    エラー --> 入力待機: リトライ
    エラー --> [*]: キャンセル

    %% キャンセル
    STREAMING --> キャンセル済: cancelStream()
    キャンセル済 --> 入力待機: リセット
```

---

### 4.8 主要ファイルの対応関係まとめ

| レイヤー | ファイルパス | 役割 | 主な関数/状態 |
|---------|-------------|------|-------------|
| **UI** | `components/ui/FeatureChat.tsx` | チャット画面全体 | `messages`, `input`, `handleSend()` |
| **UI** | `components/ui/StreamingMessage.tsx` | ストリーミング表示 | `useLLMStream()`フック含む |
| **UI** | `components/ui/MessageBubble.tsx` | 個別メッセージ | 表示専用 |
| **Hook** | `hooks/useConversationSave.ts` | 履歴管理 | `currentChatId`, `saveConversation()` |
| **API** | `app/api/llm/stream/route.ts` | LLMストリーミングAPI | `POST`ハンドラ |
| **API** | `app/api/chat/feature/route.ts` | 履歴CRUD API | `GET`, `POST`, `DELETE` |
| **Lib** | `lib/llm/langchain/factory.ts` | LangChainモデル生成 | `createLangChainModel()` |
| **Lib** | `lib/llm/langchain/chains/streaming.ts` | ストリーミング実行 | `executeStreamingChat()` |
| **Lib** | `lib/api/llm-client.ts` | APIクライアント | `streamLLMResponse()` |

---

## 5. Gem（機能別チャット）システム

### 5.1 Gemとは

Gem = 特定の用途に特化したチャット機能（GeminiのGemと同様）

```mermaid
graph LR
    subgraph "【8つのGem】"
        direction TB

        GENERAL["💬 general<br/>一般チャット"]

        subgraph "リサーチ系"
            RCAST["👥 research-cast<br/>出演者リサーチ"]
            RLOC["📍 research-location<br/>場所リサーチ"]
            RINFO["🔍 research-info<br/>情報リサーチ"]
            REVI["✅ research-evidence<br/>エビデンス"]
        end

        subgraph "ドキュメント系"
            MINUTES["📋 minutes<br/>議事録作成"]
            PROPOSAL["💡 proposal<br/>新企画立案"]
            NASCRIPT["🎤 na-script<br/>NA原稿"]
        end
    end
```

### 5.2 Gemの構造

```mermaid
graph TB
    subgraph "【Gem定義】lib/chat/gems.ts"
        GEM_DEF["Gemインターフェース"]

        GEM_DEF --> ID["id: GemId<br/>識別子"]
        GEM_DEF --> NAME["name: string<br/>表示名"]
        GEM_DEF --> DESC["description: string<br/>説明"]
        GEM_DEF --> ICON["icon: string<br/>アイコン名"]
        GEM_DEF --> PROMPT["systemPrompt: string<br/>システムプロンプト"]
        GEM_DEF --> PLACEHOLDER["placeholder: string<br/>入力欄プレースホルダー"]
        GEM_DEF --> OUTPUT["outputFormat: 'markdown' | 'plaintext'<br/>出力形式"]
        GEM_DEF --> CATEGORY["category: 'research' | 'document' | 'general'<br/>カテゴリ"]
        GEM_DEF --> PROMPT_KEY["promptKey: string<br/>DBプロンプトキー"]
        GEM_DEF --> TOOLS["toolOptions: ToolOptions<br/>ツール設定"]
    end

    subgraph "【ツールオプション】"
        TOOL_DEF["ToolOptions"]
        TOOL_DEF --> WEB["enableWebSearch<br/>Web検索"]
        TOOL_DEF --> X["enableXSearch<br/>X検索"]
        TOOL_DEF --> CODE["enableCodeExecution<br/>コード実行"]
    end

    TOOLS --> TOOL_DEF
```

### 5.3 各Gemのツール設定

```mermaid
graph LR
    subgraph "【Gem別ツール設定】"
        G1["general<br/>一般チャット"] --> T1["Web検索: ON"]

        G2["research-cast<br/>出演者"] --> T2["Web検索: ON<br/>X検索: ON"]

        G3["research-location<br/>場所"] --> T3["Web検索: ON"]

        G4["research-info<br/>情報"] --> T4["Web検索: ON<br/>X検索: ON"]

        G5["research-evidence<br/>エビデンス"] --> T5["Web検索: ON"]

        G6["minutes<br/>議事録"] --> T6["ツール: OFF"]

        G7["proposal<br/>企画立案"] --> T7["Web検索: ON<br/>X検索: ON"]

        G8["na-script<br/>NA原稿"] --> T8["ツール: OFF"]
    end
```

### 5.4 プロンプト管理フロー

```mermaid
graph TB
    subgraph "【プロンプト取得フロー】"
        START["Gem使用開始"] --> GET_GEM["getGemById(id)"]
        GET_GEM --> CHECK_PROMPT["プロンプト取得試行"]

        CHECK_PROMPT -->|"1. DBから取得"| DB_PROMPT["lib/prompts/db.ts<br/>getPromptFromDB(key)"]
        DB_PROMPT --> DB[(PostgreSQL<br/>SystemPromptテーブル)]
        DB --> DB_RESULT{"DBに<br/>存在?"}

        DB_RESULT -->|"Yes"| USE_DB["DBのプロンプトを使用"]
        DB_RESULT -->|"No"| FALLBACK["DEFAULT_PROMPTS<br/>からフォールバック"]

        CHECK_PROMPT -->|"2. フォールバック"| FALLBACK

        USE_DB --> END["Gem初期化完了"]
        FALLBACK --> END
    end
```

---

## 6. コンポーネント階層

### 6.1 ページ構成

```mermaid
graph TD
    ROOT["📄 app/layout.tsx<br/>ルートレイアウト"] --> GLOBAL["🎨 globals.css<br/>グローバルスタイル"]
    ROOT --> FONT["🔤 Geistフォント<br/>Google Fonts"]

    ROOT --> AUTH_LAYOUT["📄 app/(authenticated)/layout.tsx<br/>認証必須レイアウト"]

    AUTH_LAYOUT -->|"認証チェック"| CHECK{"ログイン<br/>済み?"}
    CHECK -->|"No"| REDIRECT["↪️ /auth/signin<br/>へリダイレクト"]
    CHECK -->|"Yes"| APP_LAYOUT["🧩 AppLayout.tsx"]

    APP_LAYOUT --> SIDEBAR["📁 Sidebar.tsx<br/>左サイドバー"]
    APP_LAYOUT --> MAIN["📄 Main Content<br/>メイン領域"]

    MAIN -->|"チャットページの場合"| CHAT_PAGE["💬 ChatPage.tsx"]
    CHAT_PAGE --> FEATURE_CHAT["🎯 FeatureChat.tsx"]
```

### 6.2 FeatureChatの内部構造

```mermaid
graph TB
    subgraph "【FeatureChat.tsx】内部構造"
        FC["FeatureChat"]

        FC --> HEADER["┌─ ChatHeader.tsx<br/>│  ├─ タイトル表示<br/>│  ├─ コピー/クリアボタン<br/>│  └─ Wordエクスポート"]

        FC --> MESSAGES["├─ メッセージ表示エリア<br/>│  ├─ 履歴メッセージ<br/>│  │   └─ MessageBubble.tsx<br/>│  ├─ ストリーミング中<br/>│  │   └─ StreamingMessage.tsx<br/>│  ├─ プロンプトサジェスト<br/>│  │   └─ PromptSuggestions.tsx<br/>│  └─ 再生成ボタン"]

        FC --> INPUT["└─ ChatInputArea.tsx<br/>   ├─ テキスト入力<br/>   ├─ ファイル添付<br/>   └─ 送信ボタン"]
    end

    subgraph "【MessageBubble.tsx】"
        BUBBLE["MessageBubble"]
        BUBBLE --> AVATAR["アバター<br/>ユーザー/AI"]
        BUBBLE --> CONTENT["コンテンツ<br/>MarkdownRenderer"]
        BUBBLE --> META["メタ情報<br/>時刻/プロバイダー"]
    end

    subgraph "【StreamingMessage.tsx】"
        STREAM["StreamingMessage"]
        STREAM --> TOOL["ツール呼び出し表示"]
        STREAM --> THINK["思考プロセス表示"]
        STREAM --> TEXT["生成中テキスト"]
        STREAM --> USAGE["トークン使用量"]
    end

    MESSAGES --> BUBBLE
    MESSAGES --> STREAM
```

---

## 7. データベーススキーマ

### 7.1 主要テーブル関係

```mermaid
erDiagram
    USER ||--o{ RESEARCH_CHAT : "1人が複数のチャット"
    USER ||--o{ MEETING_NOTE : "1人が複数の議事録"
    USER ||--o{ TRANSCRIPT : "1人が複数の文字起こし"
    USER ||--o{ USAGE_LOG : "1人が複数の使用ログ"
    USER ||--o{ PROGRAM_SETTINGS : "1人が1つの設定"
    USER ||--o{ GROK_TOOL_SETTINGS : "1人が1つの設定"
    USER ||--o{ ACCOUNT : "1人が複数の認証"
    USER ||--o{ SESSION : "1人が複数のセッション"

    RESEARCH_CHAT ||--o{ RESEARCH_MESSAGE : "1チャットが複数のメッセージ"

    USER {
        string id PK "UUID"
        string email UK "メールアドレス"
        string name "表示名"
        string image "プロフィール画像URL"
        string role "ADMIN or USER"
        datetime emailVerified "メール認証日時"
        string googleId UK "Google ID"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    RESEARCH_CHAT {
        string id PK "UUID"
        string userId FK "ユーザーID"
        string agentType "PEOPLE/LOCATION/INFO/EVIDENCE"
        string title "チャットタイトル"
        enum llmProvider "使用したLLM"
        json results "結果JSON"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    RESEARCH_MESSAGE {
        string id PK "UUID"
        string chatId FK "チャットID"
        string role "USER/ASSISTANT/SYSTEM"
        string content "メッセージ内容"
        string thinking "思考プロセス"
        datetime createdAt "作成日時"
    }

    MEETING_NOTE {
        string id PK "UUID"
        string userId FK "ユーザーID"
        string type "MEETING/INTERVIEW"
        string rawText "元テキスト"
        string formattedText "整形済みテキスト"
        enum llmProvider "使用したLLM"
        string status "DRAFT/FORMATTING/COMPLETED"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    TRANSCRIPT {
        string id PK "UUID"
        string userId FK "ユーザーID"
        string rawText "元テキスト"
        string formattedText "整形済みテキスト"
        enum llmProvider "使用したLLM"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    USAGE_LOG {
        string id PK "UUID"
        string userId FK "ユーザーID"
        enum provider "使用したプロバイダー"
        int inputTokens "入力トークン数"
        int outputTokens "出力トークン数"
        float cost "コスト(USD)"
        json metadata "追加情報"
        datetime createdAt "作成日時"
    }

    PROGRAM_SETTINGS {
        string id PK "UUID"
        string userId FK UK "ユーザーID(一意)"
        string programInfo "番組情報"
        string pastProposals "過去の企画案"
        datetime updatedAt "更新日時"
    }

    GROK_TOOL_SETTINGS {
        string id PK "UUID"
        string userId FK UK "ユーザーID(一意)"
        json settings "ツール設定JSON"
        datetime updatedAt "更新日時"
    }

    ACCOUNT {
        string id PK "UUID"
        string userId FK "ユーザーID"
        string type "oauth等"
        string provider "google等"
        string providerAccountId "プロバイダー側ID"
        string refresh_token "リフレッシュトークン"
        string access_token "アクセストークン"
        int expires_at "有効期限"
    }

    SESSION {
        string id PK "UUID"
        string sessionToken UK "セッショントークン"
        string userId FK "ユーザーID"
        datetime expires "有効期限"
    }
```

### 7.2 インデックス設計

```mermaid
graph LR
    subgraph "【インデックス設計】パフォーマンス最適化"
        I1["User.email<br/>UK"]
        I2["User.googleId<br/>UK"]

        I3["ResearchChat<br/>(userId, agentType, createdAt)<br/>複合インデックス"]
        I4["ResearchChat<br/>(userId, createdAt)"]

        I5["ResearchMessage<br/>(chatId, createdAt)"]

        I6["MeetingNote<br/>(userId, status, createdAt)<br/>複合インデックス"]

        I7["UsageLog<br/>(userId, provider, createdAt)<br/>複合インデックス"]
        I8["UsageLog<br/>(createdAt, cost)"]

        I9["AppLog<br/>(level, createdAt)"]
        I10["AppLog<br/>(category, createdAt)"]
    end
```

---

## 8. ファイル依存関係

### 8.1 認証系ファイルの関係

```mermaid
graph TB
    subgraph "【認証系】ファイル依存関係"
        MIDDLEWARE["middleware.ts<br/>ミドルウェア"]

        AUTH_ROUTE["app/api/auth/[...nextauth]/route.ts<br/>認証APIエンドポイント"]

        AUTH_OPTS["lib/auth-options.ts<br/>認証設定"]

        PRISMA["lib/prisma.ts<br/>DB接続"]

        ENV[".env.local<br/>環境変数"]
    end

    MIDDLEWARE -->|"認証チェック<br/>next-auth.session-token<br/>Cookie確認"| AUTH_ROUTE

    AUTH_ROUTE -->|"import<br/>authOptions"| AUTH_OPTS

    AUTH_OPTS -->|"import<br/>PrismaAdapter"| PRISMA
    AUTH_OPTS -->|"参照<br/>GOOGLE_CLIENT_ID<br/>GOOGLE_CLIENT_SECRET"| ENV

    PRISMA -->|"参照<br/>DATABASE_URL"| ENV

    style ENV fill:#f9f,stroke:#333
    style AUTH_OPTS fill:#bbf,stroke:#333
```

### 8.2 LLM系ファイルの関係

```mermaid
graph TB
    subgraph "【LLM系】ファイル依存関係"
        STREAM_API["app/api/llm/stream/route.ts<br/>ストリーミングAPI"]

        LLM_FACTORY["lib/llm/factory.ts<br/>LLMファクトリ"]

        LC_ADAPTER["lib/llm/langchain/adapter.ts<br/>LangChainアダプター"]

        LC_FACTORY["lib/llm/langchain/factory.ts<br/>LangChainモデル生成"]

        LC_STREAM["lib/llm/langchain/chains/streaming.ts<br/>ストリーミング処理"]

        LLM_TYPES["lib/llm/types.ts<br/>型定義"]

        LLM_CONFIG["lib/llm/config.ts<br/>設定"]

        AUTH_UTIL["lib/api/auth.ts<br/>認証ユーティリティ"]
    end

    STREAM_API -->|"import<br/>createLangChainModel"| LLM_FACTORY
    STREAM_API -->|"import<br/>requireAuth"| AUTH_UTIL

    LLM_FACTORY -->|"import<br/>createLangChainClient"| LC_ADAPTER

    LC_ADAPTER -->|"import<br/>LLMProvider型"| LLM_TYPES
    LC_ADAPTER -->|"import<br/>PROVIDER_CONFIG"| LLM_CONFIG

    LC_ADAPTER -->|"import<br/>createLangChainModel"| LC_FACTORY

    LC_FACTORY -->|"import<br/>executeStreamingChat"| LC_STREAM

    style LLM_TYPES fill:#bfb,stroke:#333
    style LLM_CONFIG fill:#bfb,stroke:#333
```

### 8.3 チャット機能ファイルの関係

```mermaid
graph TB
    subgraph "【チャット機能】ファイル依存関係"
        CHAT_PAGE["app/chat/page.tsx<br/>チャットページ"]

        CHAT_COMP["components/chat/ChatPage.tsx<br/>チャットコンポーネント"]

        FEATURE["components/ui/FeatureChat.tsx<br/>機能別チャットUI"]

        USE_CONV["hooks/useConversationSave.ts<br/>履歴保存フック"]

        USE_STREAM["components/ui/StreamingMessage.tsx<br/>useLLMStreamフック"]

        CHAT_API["app/api/chat/feature/route.ts<br/>チャットAPI"]

        LLM_CLIENT["lib/api/llm-client.ts<br/>LLMクライアント"]

        GEMS["lib/chat/gems.ts<br/>Gem定義"]

        PROMPT_DB["lib/prompts/db.ts<br/>プロンプトDB"]
    end

    CHAT_PAGE -->|"import<br/>ChatPage"| CHAT_COMP

    CHAT_COMP -->|"import<br/>FeatureChat"| FEATURE
    CHAT_COMP -->|"import<br/>getGemById"| GEMS

    FEATURE -->|"use<br/>useConversationSave"| USE_CONV
    FEATURE -->|"use<br/>useLLMStream"| USE_STREAM

    USE_CONV -->|"fetch<br/>POST /api/chat/feature"| CHAT_API

    USE_STREAM -->|"import<br/>streamLLMResponse"| LLM_CLIENT

    GEMS -->|"import<br/>getPromptFromDB"| PROMPT_DB

    style FEATURE fill:#bbf,stroke:#333
    style GEMS fill:#fbf,stroke:#333
```

### 8.4 プロンプト管理ファイルの関係

```mermaid
graph TB
    subgraph "【プロンプト管理】ファイル依存関係"
        GEMS["lib/chat/gems.ts<br/>Gem定義"]

        PROMPT_INDEX["lib/prompts/index.ts<br/>統合エクスポート"]

        PROMPT_DB["lib/prompts/db.ts<br/>DB管理（メイン）"]

        PRISMA["lib/prisma.ts<br/>DB接続"]

        ADMIN_API["app/api/admin/prompts/route.ts<br/>管理API"]

        CHAT_API["app/api/chat/feature/route.ts<br/>チャットAPI"]
    end

    GEMS -->|"import<br/>DEFAULT_PROMPTS等"| PROMPT_INDEX

    PROMPT_INDEX -->|"re-export<br/>from './db'"| PROMPT_DB

    PROMPT_DB -->|"import<br/>prisma"| PRISMA

    ADMIN_API -->|"import<br/>プロンプト操作関数"| PROMPT_DB

    CHAT_API -->|"import<br/>createLLMClient"| LLM
    CHAT_API -->|"バックグラウンドで<br/>タイトル生成"| GEMS

    style PROMPT_DB fill:#fbb,stroke:#333
    style GEMS fill:#fbf,stroke:#333
```

---

## 9. 関連ドキュメント

- [システムアーキテクチャ](./system-architecture.md)
- [API仕様書](../api-integration/api-specification.md)
- [データベーススキーマ](../api-integration/database-schema.md)
- [開発ワークフロー](../../guides/development/workflow-standards.md)
