# 番組ナレッジ権限管理 設計プラン

作成日: 2026-03-13

---

## 概要

ユーザーごとに番組ナレッジへのアクセス権限を管理する機能を追加する。
スーパーアドミン（開発者）がDBに初期権限を設定し、番組管理者が管理画面で権限ON/OFFを操作できる。
全ユーザーが権限申請可能。

---

## ロール体系

### 変更前 → 変更後

| 変更前 | 変更後 | 備考 |
|--------|--------|------|
| `ADMIN` | `DEVELOPER` | 開発者権限。/admin含む全アクセス |
| (なし) | `MANAGER` | 番組管理者。通常アプリ + 番組権限管理UI |
| `USER` | `USER` | 変更なし |

### 各ロールのアクセス範囲

| 機能 | DEVELOPER | MANAGER | USER |
|------|-----------|---------|------|
| /admin/* | ○ | × | × |
| 通常アプリ | ○ | ○ | ○ |
| /settings/program-permissions | ○ | ○ | ○ |
| /settings/program-knowledge（番組ナレッジ閲覧） | ○ | ○（担当番組） | ○（権限あり番組） |
| 番組ナレッジ（チャット） | 全番組自動通過 | 権限あり番組のみ | 権限あり番組のみ |
| 番組権限ON/OFF操作 | ○ | ○（担当番組のみ） | × |
| 番組権限申請 | 不要 | 不要 | ○ |
| 初期権限バルク登録 | ○ | × | × |

---

## DBスキーマ設計

### 既存テーブルの変更

**`users.role` の値変更**（型は `String` のまま）

```sql
-- マイグレーション: 既存ADMIN → DEVELOPER
UPDATE users SET role = 'DEVELOPER' WHERE role = 'ADMIN';
```

変更が必要な箇所:
- `app/api/admin/users/[id]/role/route.ts` — `z.enum(["ADMIN", "USER"])` → `["DEVELOPER", "MANAGER", "USER"]`
- `app/admin/users/page.tsx` — ロール表示・変更UIの更新
- `lib/api/auth.ts` — `requireAdmin` → `requireDeveloper`、`requireManager` 追加

### 新規テーブル

#### `ProgramPermission`（ユーザー×番組の権限）

```prisma
model ProgramPermission {
  id        String   @id @default(uuid())
  userId    String
  programId String   // lib/knowledge の ProgramInfo.id と対応（例: "matsuko"）
  role      String   @default("VIEWER") // "VIEWER" | "MANAGER"
  isActive  Boolean  @default(true)     // ON/OFFスイッチ
  grantedBy String?                     // 付与者のuserId
  grantedAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, programId])
  @@index([programId, isActive])
  @@index([userId])
}
```

#### `ProgramAccessRequest`（権限申請）

```prisma
model ProgramAccessRequest {
  id         String    @id @default(uuid())
  userId     String
  programId  String
  status     String    @default("PENDING") // "PENDING" | "APPROVED" | "REJECTED"
  message    String?   @db.Text           // 申請理由（任意）
  reviewedBy String?                       // 承認/却下した管理者のuserId
  reviewedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, programId, status])  // PENDING は1件のみ
  @@index([programId, status])
  @@index([userId])
}
```

---

## 権限チェックロジック（重要設計決定）

### DEVELOPERのDB管理方針: バイパス方式

DEVELOPERはDBに `ProgramPermission` レコードを持たず、ロールチェックで即通過する。

**理由:**
- 13番組分のレコードを持つことで権限管理テーブルにノイズが増える
- 新番組追加時にDEVELOPERのDBレコードも更新する運用コストが発生する
- ロジックは1関数に集約されるため一元管理は保たれる

**実装: `lib/api/program-permissions.ts`（新規作成）**

```typescript
export async function canAccessProgram(
  userId: string,
  userRole: string,
  programId: string
): Promise<boolean> {
  // DEVELOPER は無条件通過
  if (userRole === "DEVELOPER") return true;

  // それ以外はDBを参照
  const permission = await prisma.programPermission.findUnique({
    where: { userId_programId: { userId, programId } },
  });

  return permission?.isActive === true;
}

export async function getAccessiblePrograms(
  userId: string,
  userRole: string
): Promise<string[]> {
  if (userRole === "DEVELOPER") {
    // 全番組IDを返す
    return ALL_PROGRAM_IDS;
  }

  const permissions = await prisma.programPermission.findMany({
    where: { userId, isActive: true },
    select: { programId: true },
  });

  return permissions.map((p) => p.programId);
}
```

---

## APIエンドポイント設計

### 権限管理API（MANAGER以上）

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/program-permissions/[programId]/users` | 番組のユーザー権限一覧 | MANAGER+ |
| PATCH | `/api/program-permissions/[programId]/users/[userId]` | 権限ON/OFF | MANAGER+ |
| GET | `/api/program-permissions/[programId]/requests` | 申請一覧（承認待ち） | MANAGER+ |
| POST | `/api/program-permissions/[programId]/requests/[id]/review` | 承認/却下 | MANAGER+ |

### 一般ユーザー向けAPI

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| GET | `/api/program-permissions/my` | 自分の権限番組一覧 | 認証済み |
| POST | `/api/program-permissions/request` | 権限申請 | 認証済み |
| GET | `/api/program-permissions/requests/my` | 自分の申請状況 | 認証済み |

### 開発者向けAPI

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| POST | `/api/admin/program-permissions/bulk` | 初期権限一括登録 | DEVELOPER |

### チャットAPI（変更）

- `/api/llm/stream` — `programId` + `userId` で `canAccessProgram()` を呼び出し
  - アクセス不可の場合: `403` を返す

---

## フロントエンド設計

### サイドバー変更（`components/layout/Sidebar.tsx`）

ログアウトボタンの上に設定ボタンを追加:
```
⚙ 設定  → /settings
```

### `/settings` ページ構成

```
/settings
  ├── プロフィール設定（既存or新規）
  ├── 番組ナレッジ閲覧  → /settings/program-knowledge
  └── 番組権限管理      → /settings/program-permissions
```

### `/settings/program-knowledge`（新規）

**目的:** 自分がアクセス権を持つ番組のナレッジを閲覧できる

- 権限のある番組カード一覧
- 各番組カードをクリック → 番組詳細ナレッジをアコーディオン表示
  - 基本情報（放送局・スケジュール・MC・スタッフ）
  - 番組概要・コーナー構成
  - 直近の放送回（recentEpisodes）
  - ラインナップ情報（lineupがある番組のみ）
- DEVELOPERは全13番組を閲覧可能
- USERは権限のある番組のみ

### `/settings/program-permissions`（新規）

**MANAGERが見る画面:**
```
担当番組ごとに表示
  [番組名]
    ├── アクセス承認済みユーザー一覧
    │     各ユーザー: 名前 / メール / ON・OFFスイッチ
    └── 申請中リスト
          各申請: 名前 / 申請理由 / 承認・却下ボタン
```

**USERが見る画面:**
```
全13番組を一覧表示
  ├── [権限あり・有効]    → 緑バッジ「アクセス可能」
  ├── [権限あり・無効]    → 灰バッジ「停止中」
  ├── [申請中]           → 黄バッジ「申請中」
  └── [未申請・アクセス不可] → 「申請する」ボタン → モーダルで申請理由入力
```

### 番組選択UI変更（`components/chat/ProgramSelectionView.tsx`）

- 起動時に `/api/program-permissions/my` を取得
- 権限のある番組: 通常表示（選択可）
- 権限のない番組: グレーアウト表示 + 「申請する」ボタン
  - 申請済みの場合は「申請中」バッジ表示
  - DEVELOPERはAPI呼び出しなし（フロントでロール判定して全番組表示）

---

## メール通知

### 現状

メール送信サービス未導入。

### 採用サービス: Resend

Next.js との相性が最良。`npm install resend` で追加。

### 通知タイミング

| タイミング | 送信先 | 内容 |
|-----------|--------|------|
| ユーザーが権限申請 | 該当番組の全MANAGERユーザー | 申請者名・番組名・申請理由 |
| MANAGERが承認 | 申請ユーザー | 番組名・承認完了メッセージ |
| MANAGERが却下 | 申請ユーザー | 番組名・却下メッセージ |

### 実装方針

`/api/program-permissions/request` POST時と `/review` POST時にサーバーサイドで非同期送信。
送信失敗は権限操作には影響させない（fire-and-forget）。

---

## 実装ステップ

| # | 作業 | ファイル |
|---|------|---------|
| 1 | DBマイグレーション | Prismaスキーマ変更 + `ADMIN→DEVELOPER` データ移行 |
| 2 | 認証ライブラリ更新 | `lib/api/auth.ts` |
| 3 | 権限チェック関数作成 | `lib/api/program-permissions.ts` |
| 4 | adminユーザー管理UI修正 | `app/api/admin/users/[id]/role/route.ts`、`app/admin/users/page.tsx` |
| 5 | 初期権限バルク登録API | `app/api/admin/program-permissions/bulk/route.ts` |
| 6 | 番組権限CRUD API群 | `app/api/program-permissions/*` |
| 7 | Resend導入 + メール通知 | `lib/email/send.ts`（新規） |
| 8 | チャットAPIに権限チェック追加 | `app/api/llm/stream/route.ts` |
| 9 | サイドバーに設定ボタン追加 | `components/layout/Sidebar.tsx` |
| 10 | 番組選択UI修正（権限フィルタ） | `components/chat/ProgramSelectionView.tsx` |
| 11 | `/settings/program-knowledge` 作成 | `app/settings/program-knowledge/page.tsx` |
| 12 | `/settings/program-permissions` 作成 | `app/settings/program-permissions/page.tsx` |

---

## 調査メモ

### 現在のコードベース

#### チャットの番組ナレッジの流れ

```
クライアント → POST /api/llm/stream { programId, featureId, messages }
  → buildSystemPrompt(programId, featureId) in lib/prompts/system-prompt.ts
  → PROGRAMS配列（system-prompt.ts内に直接定義）から該当番組を検索
  → システムプロンプトに番組情報を埋め込み
  → GrokClient でストリーミング
```

`system-prompt.ts` の `PROGRAMS` 配列は `lib/knowledge/programs.ts` とは別に独立定義されている点に注意。
権限チェックは `/api/llm/stream` の `requireAuth` の直後、`buildSystemPrompt` の前に挟む。

#### 認証・ロールチェックの現状

- `lib/api/auth.ts` に `requireAuth`、`requireRole`、`requireAdmin` が定義済み
- `requireAdmin` は `requireRole(req, ["ADMIN"])` を呼ぶだけ
- `middleware.ts` では `/admin` へのロールチェックはしていない（セッション更新のみ）
  - `/admin` ページのサーバーコンポーネント内か、APIルートで個別にチェックしている
- Supabase Auth を使用。`users` テーブルの `role` カラム（String）で管理

#### 現在のロール値

- DBには `"ADMIN"` と `"USER"` の2値が存在
- `node_modules/.prisma/client/schema.prisma` がソース（`prisma/` ディレクトリは不在）

#### 番組データ

13番組:
- `matsuko`（マツコの知らない世界 / TBS）
- `shikujiri`（しくじり先生 / テレビ朝日・Abema）
- `kaneo`（有吉のお金発見 突撃！カネオくん / NHK）
- `achikochi`（あちこちオードリー / テレビ東京）
- `kamaigachi`（かまいガチ / テレビ朝日）
- `onirenchan`（千鳥の鬼レンチャン / フジテレビ）
- `maniasan`（熱狂マニアさん！ / TBS）
- `hayashiosamu`（林修の今知りたいでしょ！ / テレビ朝日）
- `kamichallenge`（THE神業チャレンジ / TBS）
- `nikagame`（ニカゲーム / テレビ朝日）
- `mainichioogiri`（まいにち大喜利 / テレビ朝日・YouTube）
- `mainichishouresu`（まいにち賞レース / テレビ朝日・YouTube）
- `henaimuseum`（偏愛博物館 / BS-TBS）

ラインナップJSONあり: `maniasan`、`kamichallenge`

#### /settings 配下の現状

`app/settings/` ディレクトリは未作成（middleware.ts の matcher には `/settings/:path*` が含まれているため認証は通る）。

#### メール

`resend` パッケージは未インストール。既存コードにメール送信ロジックなし。
旧コードベース（`reference/up-web-legacy/`）に招待メール機能があり参考にできる。

#### サイドバーの現状

`components/layout/Sidebar.tsx` の下部ボタン: ログアウト・サイドバー折りたたみのみ。
設定ボタンは未設置。ユーザー情報表示もなし（`components/layout/Header.tsx` にモックのユーザーアイコンあり）。

#### middleware.ts の matcher

```
"/settings/:path*" は既に含まれている → 認証保護済み
"/admin/:path*" は含まれていない → ロールチェックはページ/APIで個別実施
```
