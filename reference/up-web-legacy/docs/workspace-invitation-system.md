# ワークスペースメンバー招待システム 設計書

## 概要

up_web Next.jsアプリケーションにおけるワークスペースメンバー招待機能の実装設計書。
既存の`workspace_members`テーブルを拡張し、トークンベースの招待リンク生成システムを構築する。

### 設計方針

| 項目 | 決定 |
|------|------|
| DB設計 | 既存`workspace_members`テーブル拡張（token列追加） |
| 通知方式 | リンク生成のみ（メール送信なし、管理者が手動共有） |
| 有効期限 | 7日間 |

---

## 1. データベース設計

### 1.1 マイグレーション

**ファイル:** `/supabase/migrations/YYYYMMDDHHMMSS_add_invitation_tokens.sql`

```sql
-- ============================================
-- Workspace Member Invitation Token System
-- ============================================

-- Add invitation token columns to workspace_members
ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS invitation_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;

-- Create index for token lookup
CREATE INDEX IF NOT EXISTS idx_workspace_members_invitation_token
  ON workspace_members(invitation_token)
  WHERE invitation_token IS NOT NULL;

-- Create index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_workspace_members_invitation_expires
  ON workspace_members(invitation_expires_at)
  WHERE invitation_expires_at IS NOT NULL;

-- Comments
COMMENT ON COLUMN workspace_members.invitation_token IS 'UUID token for invitation link (null after acceptance)';
COMMENT ON COLUMN workspace_members.invitation_expires_at IS 'Invitation expiration timestamp (7 days from creation)';

-- Optional: Function to cleanup expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM workspace_members
  WHERE status = 'invited'
    AND invitation_expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

### 1.2 データ構造

| カラム名 | 型 | 説明 |
|---------|-----|------|
| invitation_token | TEXT (UNIQUE) | UUIDトークン（招待承認後はNULL） |
| invitation_expires_at | TIMESTAMPTZ | 有効期限（招待作成から7日後） |

---

## 2. TypeScript型定義

**ファイル:** `/lib/types/database.ts`

```typescript
// 既存のWorkspaceMemberインターフェースを拡張
export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string | null;
  email: string | null;
  invited_by: string | null;
  invited_at: string | null;
  role: WorkspaceRole;
  status: MemberStatus;
  joined_at: string | null;
  // 追加フィールド
  invitation_token: string | null;
  invitation_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// 招待作成用の入力型
export interface CreateInvitationInput {
  email: string;
  role: Exclude<WorkspaceRole, 'owner'>; // ownerは招待不可
}

// 招待詳細情報（トークン検証用）
export interface InvitationDetails {
  id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  email: string;
  role: WorkspaceRole;
  inviter_name: string | null;
  invited_at: string;
  expires_at: string;
  is_expired: boolean;
}

// 招待リンク生成結果
export interface InvitationLinkResult {
  invitation_id: string;
  invitation_token: string;
  invitation_url: string;
  expires_at: string;
}
```

---

## 3. API設計

### 3.1 エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/workspace/[slug]/members/invite` | 招待作成・リンク生成 |
| GET | `/api/invitations/[token]` | 招待情報取得（トークン検証） |
| POST | `/api/invitations/[token]/accept` | 招待承認 |
| POST | `/api/workspace/[slug]/members/[id]/resend` | 招待再送信（新トークン生成） |
| DELETE | `/api/workspace/[slug]/members/[id]/revoke` | 招待取消 |

### 3.2 招待作成API

**ファイル:** `/app/api/workspace/[slug]/members/invite/route.ts`

**処理フロー:**
1. 認証チェック
2. リクエストボディ解析（email, role）
3. Emailバリデーション（正規表現）
4. Role バリデーション（admin or member のみ）
5. ワークスペース取得
6. 権限チェック（owner/adminのみ招待可能）
7. 既存メンバーチェック（重複防止）
8. トークン生成（`crypto.randomUUID()`）
9. 招待レコード作成
10. 招待URL生成して返却

**リクエスト:**
```json
{
  "email": "user@example.com",
  "role": "member"
}
```

**レスポンス:**
```json
{
  "invitation_id": "uuid",
  "invitation_token": "uuid",
  "invitation_url": "https://app.example.com/invitations/{token}",
  "expires_at": "2025-01-10T00:00:00Z"
}
```

### 3.3 招待情報取得API

**ファイル:** `/app/api/invitations/[token]/route.ts`

**処理フロー:**
1. トークンで招待レコードを取得
2. ステータス確認（invited のみ有効）
3. 期限切れチェック
4. ワークスペース・招待者情報を含めて返却

**レスポンス:**
```json
{
  "id": "uuid",
  "workspace_id": "uuid",
  "workspace_name": "ワークスペース名",
  "workspace_slug": "workspace-slug",
  "email": "invited@example.com",
  "role": "member",
  "inviter_name": "招待者名",
  "invited_at": "2025-01-03T00:00:00Z",
  "expires_at": "2025-01-10T00:00:00Z",
  "is_expired": false
}
```

### 3.4 招待承認API

**ファイル:** `/app/api/invitations/[token]/accept/route.ts`

**処理フロー:**
1. 認証チェック（未ログインの場合はログインURLを返却）
2. 招待レコード取得
3. 期限切れチェック
4. メールアドレス一致チェック（警告のみ、ブロックしない）
5. 既存メンバーシップチェック
6. 招待を承認（レコード更新）
   - `user_id` をセット
   - `status` を `'active'` に変更
   - `joined_at` をセット
   - `invitation_token` を NULL にクリア

**レスポンス:**
```json
{
  "success": true,
  "workspace_slug": "workspace-slug",
  "email_mismatch": false,
  "message": "Invitation accepted successfully."
}
```

### 3.5 招待再送信API

**ファイル:** `/app/api/workspace/[slug]/members/[id]/resend/route.ts`

**処理フロー:**
1. 認証・権限チェック
2. 招待レコード取得（status='invited' のみ）
3. 新トークン生成
4. 有効期限を7日後に更新
5. 新しい招待URLを返却

### 3.6 招待取消API

**ファイル:** `/app/api/workspace/[slug]/members/[id]/revoke/route.ts`

**処理フロー:**
1. 認証・権限チェック
2. 招待レコード削除（status='invited' のみ）

---

## 4. UIコンポーネント設計

### 4.1 招待ダイアログの拡張

**ファイル:** `/app/[slug]/members/page.tsx`

招待成功後にリンクをコピー可能なダイアログを表示:

```
┌─────────────────────────────────────┐
│  招待リンクが生成されました          │
├─────────────────────────────────────┤
│  以下のリンクをコピーして、招待した  │
│  いメンバーに共有してください。      │
│                                     │
│  [https://...invitations/xxx] [Copy]│
│                                     │
│  有効期限: 2025/01/10               │
│                                     │
│              [完了]                 │
└─────────────────────────────────────┘
```

### 4.2 招待承認ページ

**ファイル:** `/app/invitations/[token]/page.tsx`

```
┌─────────────────────────────────────┐
│     ワークスペースへの招待           │
│                                     │
│  山田さんからテストワークスペース    │
│  への招待が届いています              │
├─────────────────────────────────────┤
│  ワークスペース:  テストワークスペース│
│  招待メール:      user@example.com  │
│  役割:            メンバー          │
│  有効期限:        2025/01/10        │
├─────────────────────────────────────┤
│       [招待を承認する]              │
│                                     │
│  承認することで、このワークスペース  │
│  のメンバーとして参加します。        │
└─────────────────────────────────────┘
```

**状態遷移:**
- Loading: スピナー表示
- Error: エラーメッセージ + ホームへのリンク
- Success: 成功メッセージ + 自動リダイレクト（3秒後）

### 4.3 InvitationRow の拡張

既存の招待一覧に以下のボタンを追加:
- **再送信**: 新トークンを生成してリンクコピーダイアログを表示
- **取消**: 招待を削除

---

## 5. ミドルウェア設計

**ファイル:** `/middleware.ts`

招待ページをパブリックルートに追加:

```typescript
const publicRoutes = [
  "/",
  "/auth/login",
  "/auth/sign-up",
  // ... 他のパブリックルート
  "/invitations", // 追加
];
```

---

## 6. セキュリティ考慮事項

### 6.1 トークンセキュリティ

| 対策 | 実装 |
|------|------|
| トークン生成 | `crypto.randomUUID()` による十分なエントロピー |
| トークン一意性 | データベースレベルでUNIQUE制約 |
| トークン有効期限 | 7日間 |
| トークンクリア | 招待承認後に即座にNULL化 |

### 6.2 認可チェック

| チェック項目 | 実装箇所 |
|-------------|---------|
| 招待作成権限 | owner/adminのみ（APIレベル） |
| 重複招待防止 | email単位でワークスペース内一意 |
| 自己招待防止 | 既存メンバーへの招待をブロック |
| 期限切れチェック | 招待情報取得・承認時に検証 |

### 6.3 入力バリデーション

```typescript
// Email バリデーション
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Role バリデーション
const VALID_ROLES = ['admin', 'member'];
```

---

## 7. データフロー

### 招待作成フロー

```
Admin → Members Page → Click "招待"
  → Input email & role → POST /api/workspace/{slug}/members/invite
  → Create workspace_member (status='invited', token=uuid)
  → Return invitation_url
  → Show copy dialog → Admin copies link → Share manually
```

### 招待承認フロー

```
User → Click invitation link → /invitations/{token}
  → GET /api/invitations/{token} → Validate & show invitation details
  → Click "承認" → POST /api/invitations/{token}/accept
  → (If not logged in) → Redirect to login with returnUrl
  → Update workspace_member (user_id, status='active', token=null)
  → Redirect to /{slug}/dashboard
```

---

## 8. 実装ファイル一覧

### 新規作成

| ファイルパス | 説明 |
|-------------|------|
| `/supabase/migrations/YYYYMMDDHHMMSS_add_invitation_tokens.sql` | DBマイグレーション |
| `/app/api/workspace/[slug]/members/invite/route.ts` | 招待作成API |
| `/app/api/invitations/[token]/route.ts` | 招待情報取得API |
| `/app/api/invitations/[token]/accept/route.ts` | 招待承認API |
| `/app/api/workspace/[slug]/members/[id]/resend/route.ts` | 招待再送信API |
| `/app/api/workspace/[slug]/members/[id]/revoke/route.ts` | 招待取消API |
| `/app/invitations/[token]/page.tsx` | 招待承認ページ |

### 修正

| ファイルパス | 修正内容 |
|-------------|---------|
| `/lib/types/database.ts` | 型定義の拡張 |
| `/app/[slug]/members/page.tsx` | 招待ダイアログ・InvitationRow拡張 |
| `/middleware.ts` | パブリックルート追加 |

---

## 9. 実装フェーズ

### Phase 1: データベース拡張
1. マイグレーションファイル作成
2. `supabase db push` でスキーマ適用
3. TypeScript型定義の更新

### Phase 2: API実装
1. 招待作成API
2. 招待情報取得API
3. 招待承認API
4. 招待再送信API
5. 招待取消API

### Phase 3: UI実装
1. 招待ダイアログの拡張（リンクコピー機能）
2. 招待承認ページ
3. InvitationRowの機能拡張
4. ミドルウェア更新

### Phase 4: テスト
1. 招待作成・リンク生成テスト
2. 招待承認フロー（ログイン有無）
3. 期限切れ招待の処理テスト
4. エラーハンドリングテスト

---

## 参考: 旧システム (United_Production/webapp) との比較

| 項目 | 旧システム | 新システム |
|------|-----------|-----------|
| 招待テーブル | `instance_invitations` (別テーブル) | `workspace_members` (拡張) |
| トークン保存 | 専用カラム | `invitation_token` カラム追加 |
| 承認処理 | PostgreSQL関数 (`accept_instance_invitation`) | API内で直接更新 |
| メール送信 | なし（リンクコピー） | なし（リンクコピー） |
| 有効期限 | 7日間 | 7日間 |
| UI言語 | 日本語 | 日本語 |
