# システムプロンプト管理 実装プラン

> **DB管理・バージョン履歴・管理画面の設計方針**
>
> **最終更新**: 2026-03-18 10:00

---

## 現状の整理

### 現在の構成

```
lib/prompts/
├── index.ts           # 統合エクスポート（DBファーストのフォールバック構成）
├── constants/         # プロンプト定数
│   ├── base.ts        # エージェント基本プロンプト
│   ├── keys.ts        # プロンプトキー定数
│   └── prompts.ts     # デフォルトプロンプト（フォールバック用）
├── db/                # DB操作
│   ├── crud.ts        # CRUD操作
│   ├── index.ts       # 統合エクスポート
│   ├── seed.ts        # シードデータ投入
│   ├── types.ts       # 型定義
│   ├── version.ts     # バージョン管理
│   └── versions.ts    # バージョン履歴操作
└── (廃止予定)         # 個別プロンプトファイルは段階的に廃止

lib/knowledge/
├── system-prompt.ts   # システムプロンプト生成の共通ロジック（NEW）
├── programs.ts        # 詳細版番組データ（system-prompt.tsを使用）
├── programs-simple.ts # 簡易版番組データ（system-prompt.tsを使用）
└── ...

lib/llm/
├── prompt-builder.ts  # API用プロンプト構築（NEW）
├── types.ts           # LLM型定義
├── config.ts          # プロバイダー設定
├── factory.ts         # LLMクライアント生成
└── ...
```

`SystemPrompt` テーブルはすでに存在し、DB管理の基盤はある。
`SystemPromptVersion` テーブルも追加済みで、**バージョン履歴機能は実装済み**。

### 実装済み機能

| 機能 | 状態 |
|------|------|
| SystemPromptテーブル | ✅ 実装済み |
| SystemPromptVersionテーブル | ✅ 実装済み |
| DB取得ユーティリティ | ✅ 実装済み |
| シードデータ | ✅ 実装済み |
| システムプロンプト生成の共通化 | ✅ 実装済み（lib/knowledge/system-prompt.ts） |
| API用プロンプトビルダー | ✅ 実装済み（lib/llm/prompt-builder.ts） |
| 管理API | 📝 実装中 |
| 管理UI | 📝 実装中 |
| docs からの直接更新CLI | ✅ 実装済み（scripts/prompts/update-from-doc.mjs） |

---

## プロンプト更新フロー（docs → DB 直更新）

### 基本方針

- プロンプト本文の **Single Source of Truth** は `docs/prompts/*.md` とする。
- 本番で使用する内容は、Supabase の `system_prompts` / `system_prompt_versions` に保存されたものを常に参照する。
- docs の更新を本番に反映する際は、専用の CLI スクリプト `scripts/prompts/update-from-doc.mjs` を使用する。

### CLI スクリプト: scripts/prompts/update-from-doc.mjs

- 役割: `docs/prompts/<PROMPT_KEY>.md` の内容を読み込み、対応する `system_prompts` レコードに対して新しい `system_prompt_versions` 行を追加し、`current_version` を更新する。
- 使用環境:
  - `.env.local` に以下が設定されていること
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `SUPABASE_SERVICE_ROLE_KEY`

#### 使い方

```bash
# デフォルトパス（docs/prompts/RESEARCH_CAST.md）から更新
node scripts/prompts/update-from-doc.mjs RESEARCH_CAST "大量候補＋対話フローを反映"

# 任意のファイルを指定して更新
node scripts/prompts/update-from-doc.mjs RESEARCH_CAST "一時テスト" --file path/to/custom.md
```

- 引数:
  - `<PROMPT_KEY>`: `system_prompts.key` に対応するキー（例: `RESEARCH_CAST`, `PROPOSAL`）
  - `"変更理由"`: `system_prompt_versions.reason` に保存される変更理由（任意。省略時はデフォルト文言）
  - `--file`: 読み込むファイルパスを明示指定（省略時は `docs/prompts/<PROMPT_KEY>.md`）

#### 内部処理の流れ（概要）

1. ファイル読み込み
   - `docs/prompts/<PROMPT_KEY>.md` または `--file` で指定されたパスを読み込み、空でないことを確認する。
2. `system_prompts` の取得
   - `key = <PROMPT_KEY>` かつ `is_active = true` なレコードを 1 件取得する。
   - 見つからない場合はエラー終了（先にレコードを作成する必要がある）。
3. 最新バージョンの取得
   - `system_prompt_versions` から `prompt_id = system_prompts.id` のレコードを `version DESC` で 1 件取得。
   - 見つかった `version` に対して `nextVersion = version + 1` を計算（なければ 1 とみなす）。
4. 新バージョンの挿入
   - `system_prompt_versions` に `{ prompt_id, version: nextVersion, content, reason }` を insert。
5. `current_version` の更新
   - `system_prompts.current_version` を `nextVersion` に update。

エラーが発生した場合は標準出力に詳細を出しつつ、`process.exit(1)` で終了する。

---

## システムプロンプト生成アーキテクチャ

### 概要

システムプロンプトは以下の階層構造で構築されます：

```
┌─────────────────────────────────────────────────────────────┐
│                    複合システムプロンプト                      │
│              （番組情報 + 機能固有の指示）                      │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │  番組情報レイヤー（背景知識）                           │  │
│  │  - レギュラー番組一覧（13本）                          │  │
│  │  - レギュラー番組一覧（13本）                          │  │
│  │  - 番組詳細情報（放送時間、出演者、コーナー等）          │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │  機能固有レイヤー（DBから動的取得）                      │  │
│  │  - RESEARCH_CAST: 出演者リサーチ指示 + ツール使用指示    │  │
│  │  - PROPOSAL: 企画立案指示                              │  │
│  │  - ...                                                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### ファイル構成と責務

| ファイル | 責務 | 使用場所 |
|---------|------|---------|
| `lib/knowledge/system-prompt.ts` | プロンプト生成の共通ロジック | `programs.ts`, `programs-simple.ts` |
| `lib/knowledge/programs.ts` | 詳細版番組データ + プロンプト生成 | APIルート、チャット機能 |
| `lib/knowledge/programs-simple.ts` | 簡易版番組データ + プロンプト生成 | （必要に応じて） |
| `lib/llm/prompt-builder.ts` | API用プロンプト構築（featureId対応） | `app/api/llm/stream/route.ts` |
| `lib/prompts/db/crud.ts` | DBからプロンプトを取得 | `prompt-builder.ts` |

### 機能IDとプロンプトキーのマッピング

```typescript
// lib/llm/prompt-builder.ts
const FEATURE_TO_PROMPT_KEY: Record<string, string> = {
  "general-chat": "GENERAL_CHAT",
  "research-cast": "RESEARCH_CAST",

  "research-info": "RESEARCH_INFO",
  "research-evidence": "RESEARCH_EVIDENCE",
  "minutes": "MINUTES",
  "proposal": "PROPOSAL",
  "na-script": "TRANSCRIPT",
};
```

---

## データベース設計

### テーブル: `system_prompts`

```sql
CREATE TABLE system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  current_version INTEGER DEFAULT 1,
  changed_by TEXT,
  change_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_system_prompts_category ON system_prompts(category);
CREATE INDEX idx_system_prompts_is_active ON system_prompts(is_active);
```

### テーブル: `system_prompt_versions`

```sql
CREATE TABLE system_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES system_prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  changed_by TEXT,
  change_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(prompt_id, version)
);

CREATE INDEX idx_system_prompt_versions_prompt_version ON system_prompt_versions(prompt_id, version);
CREATE INDEX idx_system_prompt_versions_prompt_created ON system_prompt_versions(prompt_id, created_at);
```

### ER図

```mermaid
erDiagram
    SystemPrompt ||--o{ SystemPromptVersion : "has"
    User ||--o{ SystemPromptVersion : "changes (optional)"

    SystemPrompt {
        string id PK
        string key UNIQUE
        string name
        string description
        string content
        string category
        bool isActive
        int currentVersion
        string changedBy
        string changeNote
        datetime createdAt
        datetime updatedAt
    }

    SystemPromptVersion {
        string id PK
        string promptId FK
        int version
        string content
        string changedBy
        string changeNote
        datetime createdAt
    }
```

---

## API 設計

### エンドポイント一覧

| メソッド | パス | 概要 |
|---------|------|------|
| `GET` | `/api/admin/prompts` | プロンプト一覧（カテゴリフィルタ対応） |
| `GET` | `/api/admin/prompts/[key]` | プロンプト詳細（現在のバージョン） |
| `PUT` | `/api/admin/prompts/[key]` | プロンプト更新（バージョン自動採番） |
| `GET` | `/api/admin/prompts/[key]/history` | バージョン履歴一覧 |
| `GET` | `/api/admin/prompts/[key]/history/[version]` | 特定バージョンの内容取得 |
| `POST` | `/api/admin/prompts/[key]/restore` | 指定バージョンに復元 |

### ストリーミングAPIのリクエスト形式

```typescript
// POST /api/llm/stream
{
  messages: LLMMessage[];
  provider?: string;        // "grok-4-1-fast" 等
  featureId?: string;       // "research-cast", "proposal" 等
  programId?: string;       // "all" または特定の番組ID
}
```

`featureId` を指定すると、対応するDBプロンプトと番組情報を結合したシステムプロンプトが使用されます。

---

## 管理 UI 設計

### ページ構成

```
/admin/prompts                    # プロンプト一覧
/admin/prompts/[key]              # 詳細・編集
/admin/prompts/[key]/history      # バージョン履歴
/admin/prompts/[key]/history/[v]  # 特定バージョン参照
```

### 一覧ページ (`/admin/prompts`)

- カテゴリ別タブ（general / minutes / transcript / research / document）
- 各プロンプトカード: 名前・説明・現在バージョン・最終更新日・最終更新者
- 検索フィルタ（プロンプト名、キー）

### 詳細・編集ページ (`/admin/prompts/[key]`)

- プロンプト本文エディタ（モノスペースフォント、行番号表示推奨）
- 変更理由入力欄（任意テキスト、保存時に記録）
- 「保存」ボタン → バージョンがインクリメントされて保存
- 「履歴を見る」リンク → 履歴ページへ
- 現在のバージョン番号・最終更新者・最終更新日時を表示

### バージョン履歴ページ (`/admin/prompts/[key]/history`)

- バージョン一覧テーブル: バージョン番号・変更者・変更理由・日時
- 各行に「内容を見る」「このバージョンに復元」ボタン
- 復元時は確認モーダル（「バージョン X に戻します。現在の内容はバージョン Y として保存されます」）

---

## キャッシュ戦略

現行の「リクエストごとにDB取得」から、必要に応じて以下を検討。

| 戦略 | 推奨タイミング |
|------|---------------|
| キャッシュなし（現行） | 開発初期・プロンプト変更頻度が高い時期 |
| Next.js `unstable_cache` | プロンプト変更が月数回程度になった段階 |
| Redis キャッシュ | 大量リクエスト時のみ（現時点では不要） |

更新時のキャッシュ無効化:
- `PUT /api/admin/prompts/[key]` および `POST .../restore` のレスポンス前に該当キャッシュをパージ

---

## 権限設計

| 操作 | 必要権限 |
|------|---------|
| プロンプト参照（一覧・詳細） | 管理者のみ |
| プロンプト編集・保存 | 管理者のみ |
| 履歴参照 | 管理者のみ |
| バージョン復元 | 管理者のみ |

**管理者の定義**: `User` テーブルの `role` カラムが `ADMIN` のユーザー

---

## 実装フェーズ

### Phase 1: DB 拡張 ✅ 完了

- [x] `SystemPromptVersion` テーブルの追加マイグレーション
- [x] `SystemPrompt` への `currentVersion`, `changedBy`, `changeNote` 追加
- [x] 既存プロンプトへのバージョン1レコード自動作成
- [x] `lib/prompts/db.ts` の更新処理にバージョン記録ロジック追加

### Phase 2: システムプロンプト生成の共通化 ✅ 完了

- [x] `lib/knowledge/system-prompt.ts` の作成
  - [x] `formatAllPrograms()` - 番組一覧のテキスト変換
  - [x] `programToPromptTextSimple()` - 簡易版番組情報変換
  - [x] `programToPromptTextDetailed()` - 詳細版番組情報変換
  - [x] `createSystemPromptFooter()` - システムプロンプトのフッター
  - [x] `createSingleProgramPromptBase()` - 単一番組プロンプト生成
  - [x] `createAllProgramsPromptBase()` - 全番組プロンプト生成
  - [x] `createCompositeSystemPrompt()` - 複合プロンプト生成
- [x] `lib/knowledge/programs.ts` のリファクタリング
- [x] `lib/knowledge/programs-simple.ts` のリファクタリング

### Phase 3: API用プロンプトビルダー ✅ 完了

- [x] `lib/llm/prompt-builder.ts` の作成
  - [x] `FEATURE_TO_PROMPT_KEY` - 機能IDとプロンプトキーのマッピング
  - [x] `getPromptKeyForFeature()` - 機能IDからプロンプトキーを取得
  - [x] `isValidFeatureId()` - 機能IDの検証
  - [x] `getValidFeatureIds()` - 有効な機能ID一覧を取得
  - [x] `buildSystemPrompt()` - システムプロンプトを構築
  - [x] `buildSystemPromptSync()` - 同期版（フォールバック用）
- [x] `app/api/llm/stream/route.ts` の修正（featureId対応）

### Phase 4: 管理 API 📝 実装中

- [ ] `/api/admin/prompts/` 配下のエンドポイント実装
- [ ] 管理者権限ガード
- [ ] 更新・復元 API のバージョニングロジック実装

### Phase 5: 管理 UI 📝 実装中

- [ ] `/admin/prompts` 一覧ページ
- [ ] `/admin/prompts/[key]` 編集ページ
- [ ] `/admin/prompts/[key]/history` 履歴ページ
- [ ] 復元確認モーダル

### Phase 6: コードプロンプトの廃止（将来）

- [ ] DB シードが正常に動作していることを確認
- [ ] ランタイムフォールバックコードを「DB 取得失敗時はエラーを返す」に変更
- [ ] `lib/prompts/` 内の個別ファイルを削除

> Phase 6 は Phase 1〜5 が安定稼働してから実施する。

---

## 留意事項

### プロンプトのシード（初期データ）

- `lib/prompts/constants/prompts.ts` の `DEFAULT_PROMPTS` は引き続きシード専用として残す
- `seedPrompts()` は「テーブルが空の場合のみ実行」の現行ロジックを維持
- シード時に `version = 1` の `SystemPromptVersion` レコードも同時作成する

### 変更理由メモの運用

- 強制入力にはしない（任意）。空の場合は「-」として記録
- 「何のために変更したか」を残す文化を育てる目的

### バージョン上限

- 不要に古い履歴を保持し続けることへの対応は当面不要（テキストデータのため容量は軽い）
- 将来的に必要なら「直近 N バージョン保持」ポリシーを別途設ける

### 新機能追加時の手順

新しい機能（例: `research-vtuber`）を追加する場合：

1. `lib/llm/prompt-builder.ts` の `FEATURE_TO_PROMPT_KEY` に追加：
   ```typescript
   "research-vtuber": "RESEARCH_VTUBER",
   ```

2. DBにプロンプトを登録（`RESEARCH_VTUBER` キー）

3. 完了 - 他のコード変更は不要

---

## 関連ファイル・ドキュメント

| 項目 | 参照先 |
|-----|--------|
| 現行 DB スキーマ | [database-schema.md](./database-schema.md) |
| プロンプト設計方針 | [prompt-engineering.md](./prompt-engineering.md) |
| 認証・認可 | [authentication.md](./authentication.md) |
| Prisma スキーマ | `prisma/schema.prisma` |
| DB ユーティリティ | `lib/prompts/db/crud.ts` |
| システムプロンプト生成 | `lib/knowledge/system-prompt.ts` |
| API用プロンプトビルダー | `lib/llm/prompt-builder.ts` |
| 管理画面 | `app/admin/prompts/` |
