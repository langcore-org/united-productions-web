# Sidebar Implementation Spec

> **作成日**: 2026-02-24
> **更新日**: 2026-03-20
> **状態**: ✅ 実装完了（Supabase対応済み）

## 概要

左サイドバーに以下のナビゲーション機能を実装する。
既存のサイドバーコンポーネントを拡張し、各機能ページを新規作成する。

---

## サイドバー構成

```
├── リサーチ（折りたたみメニュー）
│   ├── 出演者リサーチ → /research/cast
│   └── エビデンスリサーチ → /research/evidence
│   # 場所リサーチ・情報リサーチは4月以降実装予定
├── 議事録作成         → /minutes
├── 新企画立案         → /proposal

※第1段階ではナレーション原稿作成（NA原稿作成）は非表示
（第2段階以降で実装予定）
```

---

## 技術仕様

- **Framework**: Next.js App Router (TypeScript)
- **UI**: 既存の Tailwind CSS + shadcn/ui コンポーネントに統一する
- **State**: サイドバーの開閉状態は `localStorage` で永続化する
- **Auth**: 既存の `getServerSession` / `useSession` をそのまま使用する
- **DB**: Prisma（会話履歴の保存に使用）

---

## 実装タスク一覧

### Task 1: サイドバーコンポーネントの更新

**対象ファイル**: `components/layout/Sidebar.tsx`（既存ファイルを確認して拡張する）

```
- 以下のナビゲーション項目を追加する
- 「リサーチ」「文字起こし」は Collapsible（折りたたみ）にする
- アクティブなページをハイライト表示する（usePathname を使用）
- 各アイコンは lucide-react から適切なものを選ぶ
  - リサーチ: Search
  - 出演者: Users
  - エビデンス: Shield
  # 場所: MapPin, 情報: Info は4月以降実装予定
  - 議事録: FileText
  - 新企画: Lightbulb
  - 文字起こし: Mic
  - NA原稿: FileEdit
```

---

### Task 2: 設定ページの作成（番組情報・過去企画のインプット）

**新規ファイル**: `app/(authenticated)/settings/program/page.tsx`

```
- 番組情報と過去企画をテキストエリアで入力・保存できるページを作成する
- 保存先: Prisma の ProgramSettings テーブル（下記スキーマ参照）
- ユーザーごとに1レコード保存する
- サイドバー下部に「番組設定」リンクを追加する
```

**Prismaスキーマ追加**:
```prisma
model ProgramSettings {
  id             String   @id @default(cuid())
  userId         String   @unique
  programInfo    String   @db.Text
  pastProposals  String   @db.Text
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**API**: `app/api/settings/program/route.ts`
- `GET`: 現在のユーザーの番組設定を取得
- `POST`: 番組設定を保存

---

### Task 3: 共通チャットUIコンポーネントの作成

**新規ファイル**: `components/ui/FeatureChat.tsx`

各機能ページで共通して使うチャットUIを作成する。

```typescript
interface FeatureChatProps {
  featureId: string          // ルーティング識別子
  title: string              // ページタイトル
  systemPrompt: string       // 各機能のシステムプロンプト
  placeholder: string        // 入力欄のプレースホルダー
  inputLabel?: string        // 入力エリアのラベル（例:「文字起こしを貼り付け」）
  outputFormat?: "markdown" | "plaintext"  // plaintext の場合はコピーボタンのみ表示
}
```

**共通機能**:
- メッセージの送受信（既存の streaming API を使用）
- 会話履歴の保存（Prisma）
- plaintext モードのページ（NA原稿作成など）はレンダリングせずプレーンテキストで表示し、「Wordにコピー」ボタンを設置する

---

### Task 4: 各機能ページの作成

以下のファイルをすべて新規作成する。
各ページは `FeatureChat` コンポーネントを呼び出すだけのシンプルな構成にする。
システムプロンプトは `lib/prompts/` 以下に定数として定義し、ページからインポートする。

#### 4-1. 出演者リサーチ
**ファイル**: `app/(authenticated)/research/cast/page.tsx`
**プロンプト定数**: `lib/prompts/research-cast.ts`
```
placeholder: "企画内容・テーマを入力してください"
outputFormat: "markdown"
```

#### 4-2. エビデンスリサーチ
**ファイル**: `app/(authenticated)/research/evidence/page.tsx`
**プロンプト定数**: `lib/prompts/research-evidence.ts`
```
placeholder: "検証したい情報・主張を入力してください"
outputFormat: "markdown"
```

#### 4-5. 議事録作成
**ファイル**: `app/(authenticated)/minutes/page.tsx`
**プロンプト定数**: `lib/prompts/minutes.ts`
```
placeholder: "文字起こしテキストを貼り付けてください"
inputLabel: "文字起こし入力"
outputFormat: "markdown"
```

#### 4-6. 新企画立案
**ファイル**: `app/(authenticated)/proposal/page.tsx`
**プロンプト定数**: `lib/prompts/proposal.ts`
```
placeholder: "企画の方向性・テーマ・条件を入力してください（例：感動系、20代向け、ロケ企画）"
outputFormat: "markdown"
// システムプロンプト生成時に ProgramSettings から番組情報・過去企画を動的に挿入する
```

#### 4-7. 文字起こしフォーマット変換
**ファイル**: `app/(authenticated)/transcript/page.tsx`
**プロンプト定数**: `lib/prompts/transcript.ts`
```
placeholder: "動画の文字起こしテキストを貼り付けてください"
inputLabel: "文字起こし入力"
outputFormat: "markdown"
```

#### 4-8. NA原稿作成
**ファイル**: `app/(authenticated)/transcript/na/page.tsx`
**プロンプト定数**: `lib/prompts/na-script.ts`
```
placeholder: "文字起こしテキストを貼り付けてください"
inputLabel: "文字起こし入力"
outputFormat: "plaintext"  // Markdownレンダリングなし、Wordコピー用
```

---

### Task 5: プロンプト定数ファイルの作成

**ディレクトリ**: `lib/prompts/`

各ファイルで以下の形式でエクスポートする:

```typescript
// lib/prompts/research-cast.ts の例
export const RESEARCH_CAST_SYSTEM_PROMPT = `
## 出演者リサーチ
...（各機能のシステムプロンプト全文）
`

// 番組情報を動的に挿入するプロンプトは関数形式にする
// lib/prompts/proposal.ts の例
export const getProposalSystemPrompt = (
  programInfo: string,
  pastProposals: string
): string => `
## 新企画立案

### 番組情報
${programInfo}

### 過去の企画一覧
${pastProposals}
...
`
```

---

### Task 6: APIルートの作成

**新規ファイル**: `app/api/chat/feature/route.ts`

既存のチャットAPIを参考に、各機能向けのストリーミングAPIを作成する。

```
- POST: { featureId, message, conversationHistory }
- featureId に対応するシステムプロンプトを server-side で選択する
- 新企画立案の場合は ProgramSettings を DB から取得してプロンプトに挿入する
- ストリーミングレスポンスで返す
```

---

## ディレクトリ構成（最終形）

```
app/(authenticated)/
├── research/
│   ├── cast/page.tsx
│   └── evidence/page.tsx
│   # info/page.tsx は4月以降実装予定
├── minutes/page.tsx
├── proposal/page.tsx
├── transcript/
│   ├── page.tsx
│   └── na/page.tsx
└── settings/
    └── program/page.tsx

components/
└── ui/
    └── FeatureChat.tsx

lib/
└── prompts/
    ├── research-cast.ts
    ├── research-evidence.ts
    # research-info.ts は4月以降実装予定
    ├── minutes.ts
    ├── proposal.ts
    ├── transcript.ts
    └── na-script.ts

app/api/
├── chat/feature/route.ts
└── settings/program/route.ts
```

---

## 実装順序

1. `prisma/schema.prisma` に `ProgramSettings` を追加し `prisma migrate dev` を実行する
2. `lib/prompts/` の定数ファイルをすべて作成する
3. `components/ui/FeatureChat.tsx` を作成する
4. `app/api/chat/feature/route.ts` を作成する
5. `app/api/settings/program/route.ts` を作成する
6. 各機能ページ（Task 4）を作成する
7. `components/layout/Sidebar.tsx` にナビゲーションを追加する
8. `npx tsc --noEmit` → `npm run lint` → `npm run test` → `npm run build` の順で確認する

