# Grok Agent Tools API 仕様

> **最終更新**: 2026-02-20 16:30

## 概要

xAIのAgent Tools APIは、Grokモデルにサーバーサイドで実行されるツールを提供します。これにより、AIは自律的にツールを使いこなし、Web検索、コード実行、ドキュメント検索などを行うことができます。

## ツール一覧

### 1. Web Search (`web_search`)

| 項目 | 内容 |
|------|------|
| **名前** | Web検索 |
| **API名** | `web_search` |
| **説明** | インターネットからリアルタイムで最新情報を検索・閲覧 |
| **デフォルト** | **ON** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4.1 Fast Reasoning |

#### パラメータ

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `allowed_domains` | string[] | 検索対象ドメインを限定（最大5つ） |
| `excluded_domains` | string[] | 除外ドメインを指定（最大5つ） |
| `enable_image_understanding` | boolean | 検索結果の画像解析を有効化 |

#### 使用例

```python
from xai_sdk.tools import web_search

esponse = client.chat.create(
    model="grok-4-1-fast-reasoning",
    tools=[
        web_search(
            allowed_domains=["arxiv.org", "openai.com"],
            enable_image_understanding=True,
        ),
    ],
)
```

---

### 2. X Search (`x_search`)

| 項目 | 内容 |
|------|------|
| **名前** | X検索 |
| **API名** | `x_search` |
| **説明** | X（Twitter）からリアルタイム投稿、ユーザー、スレッドを検索 |
| **デフォルト** | **ON** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4.1 Fast Reasoning |

#### パラメータ

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `allowed_x_handles` | string[] | 特定アカウントの投稿のみ検索（最大10つ） |
| `excluded_x_handles` | string[] | 特定アカウントを除外（最大10つ） |
| `from_date` | string | 検索開始日（ISO8601形式: YYYY-MM-DD） |
| `to_date` | string | 検索終了日（ISO8601形式: YYYY-MM-DD） |
| `enable_image_understanding` | boolean | X投稿内の画像解析を有効化 |
| `enable_video_understanding` | boolean | X投稿内の動画解析を有効化 |

#### 使用例

```python
from xai_sdk.tools import x_search

response = client.chat.create(
    model="grok-4-1-fast-reasoning",
    tools=[
        x_search(
            allowed_x_handles=["elonmusk", "xai"],
            from_date="2025-10-23",
            to_date="2025-10-30",
            enable_image_understanding=True,
        ),
    ],
)
```

---

### 3. Code Execution (`code_execution`)

| 項目 | 内容 |
|------|------|
| **名前** | コード実行 |
| **API名** | `code_execution` |
| **説明** | Pythonコードを安全なサンドボックス環境で実行 |
| **デフォルト** | **OFF** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4.1 Fast Reasoning |

#### 機能

- 数値計算・データ分析
- グラフ・チャート生成
- 統計処理
- シミュレーション実行

#### 使用例

```python
from xai_sdk.tools import code_execution

response = client.chat.create(
    model="grok-4-1-fast-reasoning",
    tools=[code_execution()],
)

chat.append(user(
    "10,000ドルを年率5%で10年間複利運用した場合の最終金額を計算してください"
))
```

---

### 4. Collections Search (`collections_search` / `file_search`)

| 項目 | 内容 |
|------|------|
| **名前** | ファイル検索 / コレクション検索 |
| **API名** | `collections_search` (xAI SDK) / `file_search` (OpenAI API) |
| **説明** | アップロードしたドキュメント・ナレッジベースを検索 |
| **デフォルト** | **OFF** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4.1 Fast Reasoning |

#### 機能

- セマンティック検索（意味ベースの検索）
- PDF、テキスト、CSVなど複数形式対応
- RAG（Retrieval-Augmented Generation）ワークフロー
- 社内文書・規約の参照

#### 使用例

```python
from xai_sdk.tools import collections_search

response = client.chat.create(
    model="grok-4-1-fast-reasoning",
    tools=[
        collections_search(
            collection_ids=["collection_xxx"],
        ),
    ],
)
```

---

### 5. View Image (`view_image`)

| 項目 | 内容 |
|------|------|
| **名前** | 画像解析 |
| **API名** | `view_image` |
| **説明** | 画像を表示・分析する |
| **デフォルト** | **OFF**（Web検索/X検索の画像解析設定と連動） |
| **利用可能モデル** | Grok 4.1 Fast, Grok 2 Vision |

#### 使用例

```python
from xai_sdk.tools import view_image

response = client.chat.create(
    model="grok-4-1-fast-reasoning",
    tools=[view_image()],
)
```

---

### 6. View X Video (`view_x_video`)

| 項目 | 内容 |
|------|------|
| **名前** | X動画解析 |
| **API名** | `view_x_video` |
| **説明** | X（Twitter）投稿内の動画を表示・分析する |
| **デフォルト** | **OFF**（X検索の動画解析設定と連動） |
| **利用可能モデル** | Grok 4.1 Fast |

#### 使用例

```python
from xai_sdk.tools import view_x_video

response = client.chat.create(
    model="grok-4-1-fast-reasoning",
    tools=[view_x_video()],
)
```

---

### 7. MCP Server (`mcp_server`)

| 項目 | 内容 |
|------|------|
| **名前** | MCPサーバー接続 |
| **API名** | `mcp_server` |
| **説明** | リモートModel Context Protocol（MCP）サーバーに接続し、カスタムツールを使用 |
| **デフォルト** | **OFF** |
| **利用可能モデル** | Grok 4.1 Fast, Grok 4.1 Fast Reasoning |

#### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `server_url` | string | ✓ | リモートMCPサーバーのURL |
| `server_label` | string | | MCPサーバーの識別ラベル |
| `server_description` | string | | MCPサーバーの説明 |
| `allowed_tools` | string[] | | 使用許可するツール名のリスト |

#### 使用例

```python
from xai_sdk.tools import mcp

response = client.chat.create(
    model="grok-4-1-fast-reasoning",
    tools=[
        mcp(
            server_url="https://example.com/mcp",
            server_label="weather-service",
            server_description="Weather data provider",
            allowed_tools=["get_weather", "get_forecast"],
        ),
    ],
)
```

---

## ツールカテゴリ

### サーバーサイドツール（Built-in Tools）

xAIのサーバー上で自動実行されるツール：

| ツール名 | 用途 |
|---------|------|
| `web_search` | Web検索・閲覧 |
| `x_search` | X（Twitter）検索 |
| `code_execution` | Pythonコード実行 |
| `collections_search` | ドキュメント検索 |
| `view_image` | 画像解析 |
| `view_x_video` | X動画解析 |
| `mcp_server` | MCPサーバー接続 |

### クライアントサイドツール（Function Calling）

開発者が定義するカスタム関数。モデルが呼び出しを要求し、開発者が実行して結果を返す：

- データベースクエリ
- 社内API呼び出し
- カスタムビジネスロジック

---

## 実装状況

### 現在実装済み

| ツール | 実装状況 | 備考 |
|--------|---------|------|
| Web検索 | ✅ 実装済み | 全機能でデフォルトON |
| X検索 | ✅ 実装済み | 全機能でデフォルトON |
| コード実行 | ✅ 実装済み | デフォルトOFF |
| ファイル検索 | ✅ 実装済み | デフォルトOFF |

### 今後の拡張予定

| ツール | 優先度 | 備考 |
|--------|--------|------|
| 画像解析 | 中 | Web/X検索の画像解析設定と連動 |
| X動画解析 | 低 | 必要性に応じて検討 |
| MCPサーバー | 低 | 外部システム連携時に検討 |

---

## 設定画面

管理画面 `/admin/grok-tools` で設定可能。

### 設定項目

- **機能別ツール設定**: 8機能 × 4ツール = 32項目
- **デフォルト値**: すべてのツールをすべての機能でON

---

## 参考リンク

- [xAI Tools Overview](https://docs.x.ai/developers/tools/overview)
- [Web Search Tool](https://docs.x.ai/developers/tools/web-search)
- [Collections Search Tool](https://docs.x.ai/developers/tools/collections-search)
- [Grok 4.1 Fast Announcement](https://x.ai/news/grok-4-1-fast)
- [Vercel AI SDK - xAI Provider](https://ai-sdk.dev/providers/ai-sdk-providers/xai)
