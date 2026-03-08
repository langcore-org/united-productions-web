# Google Drive MCP Integration 設計書

## 概要

Claude Code Agent が Google Drive 上のファイルを直接読み書きできるようにするための MCP (Model Context Protocol) サーバー実装。

### 解決した課題

**Before**: ユーザーが「このPDFを読んで」と言うと、Claude Code はローカルファイルシステムでファイルを探すが、ファイルは Google Drive 上にあるため見つからない。

**After**: Claude Code が MCP ツールを使って Google Drive のファイルを直接読み書きできる。

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Next.js Frontend                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ChatInput                                                        │   │
│  │  - @mention でファイル選択                                        │   │
│  │  - ファイルをインラインチップとして表示                            │   │
│  │  - FileReference オブジェクトとして管理                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Chat Page (handleSend)                                           │   │
│  │  - workspace_id, output_folder_id を System Prompt に埋め込み     │   │
│  │  - 選択されたファイルの file_id をメッセージに含める               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Agent API (FastAPI)                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ main.py                                                          │   │
│  │  - MCP サーバー設定を構築                                         │   │
│  │  - Claude Agent SDK に mcp_servers パラメータとして渡す           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Claude Agent SDK                                                 │   │
│  │  - MCP サーバーを stdio で起動                                    │   │
│  │  - ツール呼び出しを MCP サーバーにルーティング                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Google Drive MCP Server (src/mcp_servers/gdrive/server.py)       │   │
│  │  - Workspace 単位の Service Account 認証                          │   │
│  │  - gdrive_read_file: ファイル読み込み                             │   │
│  │  - gdrive_upload_file: ファイル作成/アップロード                  │   │
│  │  - gdrive_search: ファイル検索                                    │   │
│  │  - gdrive_list_folder: フォルダ内一覧                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              Supabase                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ workspaces.google_service_account_encrypted                      │   │
│  │  - pgcrypto で暗号化された Service Account JSON                   │   │
│  │  - get_workspace_service_account() RPC で復号化                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Google Drive API                               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ファイル構成

### Agent 側

| ファイル | 役割 |
|---------|------|
| `agent/src/mcp_servers/gdrive/server.py` | Google Drive MCP サーバー本体 |
| `agent/src/mcp_client.py` | MCP サーバー管理クライアント |
| `agent/src/claude_cli.py` | Claude Agent SDK ラッパー |
| `agent/src/main.py` | FastAPI アプリ、MCP 設定統合 |

### Frontend 側

| ファイル | 役割 |
|---------|------|
| `up_web/components/chat/ChatInput.tsx` | ファイル選択 UI |
| `up_web/app/[slug]/.../chat/page.tsx` | チャットページ、System Prompt 構築 |
| `up_web/lib/modes.ts` | モード別 System Prompt 定義 |

---

## MCP ツール一覧

### gdrive_read_file

ファイルの内容を読み込む。

```typescript
gdrive_read_file(
  workspace_id: string,  // Workspace UUID
  file_id: string        // Google Drive ファイル ID
)
```

**対応形式**:
- Google Docs → プレーンテキスト
- Google Sheets → CSV
- Google Slides → プレーンテキスト
- PDF → PyMuPDF でテキスト抽出
- テキストファイル (txt, json, xml, js など)

### gdrive_upload_file

ファイルを作成/アップロード。

```typescript
gdrive_upload_file(
  workspace_id: string,  // Workspace UUID
  folder_id: string,     // 保存先フォルダ ID
  file_name: string,     // ファイル名 (例: "report.md")
  content: string,       // ファイル内容
  mime_type?: string     // MIME タイプ (自動検出可)
)
```

**自動 MIME 検出**:
- `.md` → `text/markdown`
- `.json` → `application/json`
- `.csv` → `text/csv`
- `.html` → `text/html`

### gdrive_search

ファイル名で検索。

```typescript
gdrive_search(
  workspace_id: string,
  query: string,         // 検索クエリ
  folder_id?: string     // 検索範囲フォルダ (省略で全体)
)
```

### gdrive_list_folder

フォルダ内のファイル一覧。

```typescript
gdrive_list_folder(
  workspace_id: string,
  folder_id?: string     // 省略でルート
)
```

---

## System Prompt 設計

### 構成

```
[モード固有の System Prompt]

## Google Drive ファイルシステム
workspace_id: {workspace_id}
output_folder_id: {output_folder_id}

### ファイルの保存方法
レポートや成果物を作成する場合は、Google Driveに保存してください:
gdrive_upload_file(workspace_id="...", folder_id="...", file_name="...", content="...")

**重要**: ローカルファイルシステムへの書き込みは禁止です。

### 利用可能なファイル一覧
- ファイル名1 (file_id: xxx)
- ファイル名2 (file_id: yyy)
...

### ファイル読み込み方法
ユーザーがファイル名を言及した場合:
1. 上記一覧から file_id を特定
2. gdrive_read_file ツールを使用
```

### 変数

| 変数 | ソース | 説明 |
|------|--------|------|
| `workspace_id` | `team.program.workspace_id` | MCP 認証に必要 |
| `output_folder_id` | `team.output_directory_id` | 成果物の保存先 |
| ファイル一覧 | `team_expanded_files` テーブル | チームに紐づくファイル |

---

## ChatInput UI 設計

### ファイル参照のインライン表示

```
┌──────────────────────────────────────────────────────────────────┐
│ [📄 file1.pdf ×] [📄 file2.docx ×] メッセージを入力...           │ [送信]
└──────────────────────────────────────────────────────────────────┘
```

### 動作仕様

1. **@トリガー**: `@` を入力するとファイルピッカーが開く
2. **ファイル選択**: ピッカーからファイルを選択するとチップが追加
3. **チップ表示**: ファイルはインラインチップとして表示 (編集不可)
4. **削除**: × ボタンでチップを削除
5. **ドラッグ&ドロップ**: ファイルをドロップしてもチップが追加

### FileReference インターフェース

```typescript
interface FileReference {
  id: string;           // Google Drive ファイル ID
  name: string;         // ファイル名
  mimeType: string;     // MIME タイプ
  webViewLink?: string; // Google Drive での閲覧 URL
  source: "mention" | "dragdrop" | "auto-detect";
}
```

---

## 認証フロー

### Workspace ベース Service Account 認証

```
1. Agent API 起動時
   └─ MCP サーバー設定を登録 (環境変数を含む)

2. Claude が gdrive_* ツールを呼び出し
   └─ MCP サーバーが workspace_id を受け取る

3. MCP サーバー: get_workspace_service_account() RPC
   └─ Supabase から暗号化された認証情報を取得
   └─ 復号化して Service Account JSON を取得

4. Google Drive API 呼び出し
   └─ Service Account で認証
   └─ ファイル操作を実行
```

### 必要な環境変数

```bash
# Agent (.env)
SUPABASE_URL=http://127.0.0.1:55321
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
GOOGLE_CREDENTIALS_ENCRYPTION_KEY=dev-encryption-key-32chars!!
```

---

## 依存関係

### Agent 側

```toml
# pyproject.toml
[tool.poetry.dependencies]
google-auth = "^2.0"
google-api-python-client = "^2.0"
pymupdf = "^1.24"          # PDF テキスト抽出
mcp = "^1.0"               # MCP SDK
supabase = "^2.0"
```

### データベース

```sql
-- workspaces テーブル
google_service_account_encrypted BYTEA  -- pgcrypto で暗号化

-- RPC 関数
get_workspace_service_account(
  p_workspace_id UUID,
  p_encryption_key TEXT
) RETURNS TEXT
```

---

## エラーハンドリング

| エラー | 原因 | 対処 |
|--------|------|------|
| `No service account configured` | Workspace に認証情報なし | 管理画面で設定 |
| `Google Drive API error: 403` | 権限不足 | Service Account に共有 |
| `No module named 'fitz'` | PyMuPDF 未インストール | `pip install pymupdf` |
| `Connection refused` | Supabase 未起動 | `supabase start` |

---

## 今後の改善案

1. **キャッシュ**: 読み込んだファイル内容のキャッシュ
2. **プログレス表示**: 大きなファイルの読み込み進捗
3. **バイナリ対応**: 画像ファイルの Base64 エンコード対応
4. **バッチ操作**: 複数ファイルの一括読み込み
5. **Webhook**: ファイル変更の通知
