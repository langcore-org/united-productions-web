# プロンプト管理仕様

> **システムプロンプトの管理とバージョン管理**
> 
> **最終更新**: 2026-03-20 14:35

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
│   ├── keys.ts           # プロンプトキー定数
│   └── prompts.ts        # DEFAULT_PROMPTS（シード用）
├── db/                   # DB操作
│   ├── index.ts
│   ├── types.ts          # 型定義
│   ├── crud.ts           # 基本CRUD操作
│   ├── version.ts        # バージョン管理
│   ├── versions.ts       # バージョン履歴操作
│   └── seed.ts           # シードデータ投入
└── utils.ts              # ユーティリティ

lib/llm/
└── prompt-builder.ts     # API用プロンプト構築

lib/knowledge/
└── system-prompt.ts      # システムプロンプト生成の共通ロジック

docs/prompts/             # プロンプト本文のSingle Source of Truth
├── GENERAL_CHAT.md
├── RESEARCH_CAST.md
├── RESEARCH_EVIDENCE.md
├── MINUTES.md
├── PROPOSAL.md
└── ...

scripts/prompts/
└── update-from-doc.mjs   # docs → DB 更新スクリプト
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

- `supabase/migrations/` - データベーススキーマ
- `lib/prompts/` - プロンプト管理コード
- `lib/llm/prompt-builder.ts` - API用プロンプト構築
- `lib/knowledge/system-prompt.ts` - システムプロンプト生成
- `app/admin/prompts/` - 管理画面（実装予定）
- `docs/prompts/` - プロンプト本文のSingle Source of Truth
- `scripts/prompts/update-from-doc.mjs` - docs → DB 更新スクリプト

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-03-20 | docs → DB 直接更新フロー、システムプロンプト生成の共通化を追加 |
| 2026-02-22 | 初版作成 |
