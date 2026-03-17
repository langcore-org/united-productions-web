# プロンプト管理仕様

> **システムプロンプトの管理とバージョン管理**
> 
> **最終更新**: 2026-02-22 12:15

---

## 概要

SystemPromptテーブルを使用したプロンプト管理。バージョン管理機能付き。

## ディレクトリ構成

```
lib/prompts/
├── index.ts              # エクスポート集約
├── constants/            # 定数・デフォルトプロンプト
│   ├── index.ts
│   ├── base.ts           # AGENTIC_BASE_PROMPT
│   └── prompts.ts        # DEFAULT_PROMPTS
└── db/                   # DB操作
    ├── index.ts
    ├── types.ts          # 型定義
    ├── crud.ts           # 基本CRUD操作
    └── version.ts        # バージョン管理
```

## 主要機能

### 基本CRUD

```typescript
import { 
  getPromptFromDB, 
  getPromptsFromDB, 
  getPromptsByCategory,
  getAllPrompts,
  getPromptWithFallback 
} from "@/lib/prompts";

// 単一取得
const content = await getPromptFromDB("GENERAL_CHAT");

// 複数取得
const prompts = await getPromptsFromDB(["MINUTES", "RESEARCH_CAST"]);

// カテゴリ別取得
const minutesPrompts = await getPromptsByCategory("minutes");
```

### バージョン管理

```typescript
import {
  updatePromptWithVersion,
  getPromptVersionHistory,
  getPromptVersion,
  restorePromptVersion,
  getPromptWithHistory
} from "@/lib/prompts";

// 更新（バージョン自動採番）
await updatePromptWithVersion(
  "GENERAL_CHAT", 
  "新しいプロンプト内容",
  "user-123",
  "ツール使用の説明を追加"
);

// 履歴取得
const history = await getPromptVersionHistory("GENERAL_CHAT");

// 特定バージョン取得
const v1 = await getPromptVersion("GENERAL_CHAT", 1);

// 復元
await restorePromptVersion("GENERAL_CHAT", 1, "user-123", "v1に戻す");
```

## デフォルトプロンプト

DBが空の場合やフォールバック時に使用。`DEFAULT_PROMPTS`配列で定義。

**注**: 完全なプロンプト内容はDBで管理。コード内の`DEFAULT_PROMPTS`は最小限のフォールバックのみ。

| キー | 名前 | カテゴリ |
|-----|------|---------|
| GENERAL_CHAT | 一般チャット | general |
| MINUTES | 議事録作成 | minutes |
| MEETING_FORMAT_MEETING | 議事録整形（会議用） | minutes |
| MEETING_FORMAT_INTERVIEW | 議事録整形（面談用） | minutes |
| RESEARCH_CAST | 出演者リサーチ | research |
| RESEARCH_INFO | 情報リサーチ | research |
| RESEARCH_EVIDENCE | エビデンスリサーチ | research |
| PROPOSAL | 新企画立案 | document |

### 初期データ投入

```typescript
import { seedPrompts } from "@/lib/prompts";

// アプリケーション起動時やマイグレーション時に実行
await seedPrompts();
```

## 関連ファイル

- `prisma/schema.prisma` - SystemPrompt, SystemPromptVersionスキーマ
- `app/admin/prompts/` - 管理画面
