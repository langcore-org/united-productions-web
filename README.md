# CLI Proxy - Claude Code Chat Interface

Claude Codeをチャットインターフェースで利用するためのマイクロサービス構成。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                        Client                                │
│                     (Web Browser)                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼ :3120
┌─────────────────────────────────────────────────────────────┐
│              next-chat-ui-cc-wrapper                         │
│                   (Next.js 16)                               │
│                                                              │
│  - React Chat UI                                             │
│  - Session Management                                        │
│  - SQLite Database                                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼ :8120
┌─────────────────────────────────────────────────────────────┐
│            claude-code-openai-wrapper                        │
│               (FastAPI / Python)                             │
│                                                              │
│  - OpenAI API Compatible                                     │
│  - Claude Code CLI Integration                               │
│  - SSE Streaming                                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code CLI                           │
└─────────────────────────────────────────────────────────────┘
```

## 前提条件

- **Node.js** >= 18.x
- **Python** >= 3.10
- **Poetry** (Python依存関係管理)
- **PM2** (プロセス管理)
- **Claude Code CLI** (インストール済み・認証済み)

### 前提条件のインストール

```bash
# Poetry (Python)
curl -sSL https://install.python-poetry.org | python3 -

# PM2 (Node.js)
npm install -g pm2

# Claude Code CLI
npm install -g @anthropic-ai/claude-code
claude auth login
```

## クイックスタート

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd cli_proxy
```

### 2. 環境変数の設定

#### API Wrapper (.env)

```bash
cd claude-code-openai-wrapper
cp .env.example .env
```

`.env` を編集:

```env
# Claude CLI Configuration
CLAUDE_CLI_PATH=claude

# API Configuration
# API_KEY=your-optional-api-key-here  # コメント解除で固定キー使用
PORT=8120

# Timeout Configuration (milliseconds)
MAX_TIMEOUT=600000

# CORS Configuration
CORS_ORIGINS=["*"]

# Rate Limiting Configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=30
```

#### Chat UI (.env.local)

```bash
cd ../next-chat-ui-cc-wrapper
```

`.env.local` を作成:

```env
# API Wrapper Connection
CLIPROXY_URL=http://localhost:8120/v1
CLIPROXY_API_KEY=sk-your-key  # API_KEYを設定した場合

# Wrapper URL for session management
WRAPPER_URL=http://localhost:8120

# Default Model
DEFAULT_MODEL=claude-sonnet-4-20250514

# Optional: Enable tools
ENABLE_TOOLS=false
```

### 3. デプロイ

```bash
cd ..  # cli_proxy root
./deploy.sh
```

このスクリプトは以下を実行:
1. 前提条件のチェック
2. Next.js依存関係インストール & ビルド
3. Python依存関係インストール
4. PM2でサービス起動

### 4. アクセス

- **Chat UI**: http://localhost:3120
- **API Wrapper**: http://localhost:8120
- **API Docs**: http://localhost:8120/docs

## 手動インストール

### API Wrapper (claude-code-openai-wrapper)

```bash
cd claude-code-openai-wrapper

# 環境変数設定
cp .env.example .env
# .env を編集

# 依存関係インストール
poetry install

# 開発モードで起動
poetry run uvicorn src.main:app --reload --port 8120

# 本番モードで起動
poetry run uvicorn src.main:app --host 0.0.0.0 --port 8120
```

### Chat UI (next-chat-ui-cc-wrapper)

```bash
cd next-chat-ui-cc-wrapper

# 環境変数設定
# .env.local を作成（上記参照）

# 依存関係インストール
npm install

# 開発モードで起動
npm run dev

# 本番ビルド & 起動
npm run build
npm start
```

## PM2 運用コマンド

```bash
# 起動
./scripts/start.sh
# または: pm2 start ecosystem.config.js

# 停止
./scripts/stop.sh
# または: pm2 stop all

# 再起動
./scripts/restart.sh
# または: pm2 restart all

# 状態確認
./scripts/status.sh
# または: pm2 status

# ログ表示
pm2 logs              # 全ログ
pm2 logs chat-ui      # Chat UIのみ
pm2 logs api-wrapper  # API Wrapperのみ

# 個別操作
pm2 restart chat-ui
pm2 restart api-wrapper
```

### システム起動時の自動起動設定

```bash
pm2 startup
# 表示されるコマンドを実行
pm2 save
```

## Docker デプロイ (オプション)

### API Wrapper のみ

```bash
cd claude-code-openai-wrapper
docker-compose up -d
```

## 本番環境での推奨設定

### Nginx リバースプロキシ

```nginx
# /etc/nginx/sites-available/cli-proxy

server {
    listen 80;
    server_name your-domain.com;

    # Chat UI
    location / {
        proxy_pass http://localhost:3120;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API Wrapper
    location /api/v1/ {
        proxy_pass http://localhost:8120/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

### 環境変数（本番用）

```env
# claude-code-openai-wrapper/.env
API_KEY=your-secure-api-key
CORS_ORIGINS=["https://your-domain.com"]
RATE_LIMIT_ENABLED=true

# next-chat-ui-cc-wrapper/.env.local
CLIPROXY_URL=http://localhost:8120/v1
CLIPROXY_API_KEY=your-secure-api-key
```

## トラブルシューティング

### PM2 プロセスが起動しない

```bash
# ログを確認
pm2 logs --lines 100

# プロセスを削除して再起動
pm2 delete all
pm2 start ecosystem.config.js
```

### API Wrapper に接続できない

```bash
# ポート確認
lsof -i :8120

# 直接起動してエラー確認
cd claude-code-openai-wrapper
poetry run uvicorn src.main:app --port 8120
```

### Chat UI がビルドできない

```bash
cd next-chat-ui-cc-wrapper
rm -rf node_modules .next
npm install
npm run build
```

### Claude CLI が見つからない

```bash
# CLIパス確認
which claude

# .env に絶対パスを設定
CLAUDE_CLI_PATH=/usr/local/bin/claude
```

## ディレクトリ構成

```
cli_proxy/
├── ecosystem.config.js      # PM2設定
├── deploy.sh                # デプロイスクリプト
├── README.md
├── scripts/
│   ├── start.sh
│   ├── stop.sh
│   ├── restart.sh
│   └── status.sh
├── logs/                    # PM2ログ出力先
├── next-chat-ui-cc-wrapper/ # Chat UI (Next.js)
│   ├── src/
│   ├── data/               # SQLite DB
│   ├── package.json
│   └── .env.local
└── claude-code-openai-wrapper/ # API Wrapper (Python)
    ├── src/
    ├── pyproject.toml
    └── .env
```

## ライセンス

MIT License
