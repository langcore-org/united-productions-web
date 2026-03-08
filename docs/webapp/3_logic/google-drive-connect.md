# Google Drive Connect Logic Guide

## 1. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────┐
│                        T-Agent Platform                         │
├─────────────────────────────────────────────────────────────────┤
│  Next.js Frontend (up_web/)                                     │
│  ├── Workspace Settings → Service Account JSON登録              │
│  ├── Program Settings → Root Folder選択                         │
│  └── Team Settings → 参照ファイル/出力フォルダ選択               │
├─────────────────────────────────────────────────────────────────┤
│  Next.js API Routes                                             │
│  └── /api/workspace/drive/* endpoints                           │
│      └── lib/google-drive (認証・API呼び出し)                    │
├─────────────────────────────────────────────────────────────────┤
│  Supabase                                                       │
│  ├── workspaces.google_service_account_encrypted (暗号化保存)    │
│  ├── programs.google_drive_root_id/name                         │
│  ├── teams.output_directory_id/name                             │
│  └── team_file_refs (参照ファイル/フォルダ)                      │
├─────────────────────────────────────────────────────────────────┤
│  Google APIs                                                    │
│  └── Drive API v3 (フォルダ閲覧・ファイル操作)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 認証方式: Service Account

### 2.1 選定理由

| 方式 | メリット | デメリット | 採用 |
|------|----------|------------|------|
| **Service Account** | トークン期限なし、サーバー間通信に最適 | 共有設定が必要 | ✅ |
| OAuth 2.0 | ユーザー権限で動作 | refresh token管理、期限切れ対応 | ❌ |

### 2.2 セットアップ手順

```bash
# 1. Google Cloud Console
#    APIs & Services → Credentials → Create Service Account

# 2. 必要なAPI有効化
#    - Google Drive API

# 3. サービスアカウントキー発行 (JSON)
#    → Workspace設定画面でアップロード

# 4. Google Driveで対象フォルダを共有
#    Service AccountのEmail → 編集者権限で共有
```

### 2.3 データベーススキーマ

```sql
-- workspaces table
ALTER TABLE workspaces ADD COLUMN google_service_account_encrypted TEXT;
ALTER TABLE workspaces ADD COLUMN google_drive_connected BOOLEAN DEFAULT FALSE;

-- RPC function for secure credential retrieval
CREATE OR REPLACE FUNCTION get_workspace_service_account(
  p_workspace_id UUID,
  p_encryption_key TEXT
) RETURNS TEXT AS $$
  SELECT pgp_sym_decrypt(
    google_service_account_encrypted::bytea,
    p_encryption_key
  )
  FROM workspaces
  WHERE id = p_workspace_id;
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## 3. 実装構造

### 3.1 ディレクトリ構造

```
up_web/
├── lib/
│   └── google-drive/
│       ├── index.ts          # エクスポート
│       ├── client.ts         # Drive APIクライアント
│       └── types.ts          # 型定義
├── app/
│   ├── api/
│   │   └── workspace/
│   │       └── drive/
│   │           ├── connect/route.ts    # Service Account登録
│   │           └── folders/route.ts    # フォルダ閲覧API
│   └── [slug]/
│       ├── settings/
│       │   └── drive/page.tsx          # Workspace Drive設定
│       └── programs/
│           └── [programId]/
│               ├── settings/page.tsx   # Program設定 (root folder)
│               └── teams/
│                   └── [teamId]/
│                       └── settings/page.tsx  # Team設定 (refs/output)
```

### 3.2 型定義 (`lib/google-drive/types.ts`)

```typescript
export interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  webViewLink?: string;
  iconLink?: string;
  modifiedTime?: string;
  size?: string;
}

export interface DriveFolder extends DriveFile {
  mimeType: "application/vnd.google-apps.folder";
}

export interface SharedDrive {
  id: string;
  name: string;
}

export interface FolderContents {
  files: DriveFile[];
  folders: DriveFolder[];
  nextPageToken?: string;
}
```

### 3.3 Drive APIクライアント (`lib/google-drive/client.ts`)

```typescript
import { google, drive_v3 } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import type { ServiceAccountCredentials, DriveFolder, SharedDrive, FolderContents } from "./types";

const ENCRYPTION_KEY = process.env.GOOGLE_CREDENTIALS_ENCRYPTION_KEY || "dev-encryption-key-32chars!!";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

/**
 * ワークスペースのService Account情報を取得
 */
export async function getServiceAccountCredentials(
  workspaceId: string
): Promise<ServiceAccountCredentials | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_workspace_service_account", {
    p_workspace_id: workspaceId,
    p_encryption_key: ENCRYPTION_KEY,
  });

  if (error || !data) return null;

  try {
    return JSON.parse(data) as ServiceAccountCredentials;
  } catch {
    return null;
  }
}

/**
 * Google Drive APIクライアントを作成
 */
export function createDriveClient(credentials: ServiceAccountCredentials): drive_v3.Drive {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    scopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });

  return google.drive({ version: "v3", auth });
}

/**
 * ワークスペースのDriveクライアントを取得
 */
export async function getDriveClientForWorkspace(
  workspaceId: string
): Promise<drive_v3.Drive | null> {
  const credentials = await getServiceAccountCredentials(workspaceId);
  if (!credentials) return null;
  return createDriveClient(credentials);
}

/**
 * 共有ドライブ一覧を取得
 */
export async function listSharedDrives(drive: drive_v3.Drive): Promise<SharedDrive[]> {
  try {
    const response = await drive.drives.list({
      pageSize: 100,
      fields: "drives(id, name)",
    });
    return (response.data.drives || []).map((d) => ({
      id: d.id!,
      name: d.name!,
    }));
  } catch {
    return [];
  }
}

/**
 * Service Accountがアクセス可能なルートフォルダ一覧を取得
 * （直接共有されたフォルダ）
 */
export async function listAccessibleRootFolders(drive: drive_v3.Drive): Promise<DriveFolder[]> {
  try {
    const response = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and 'me' in readers",
      pageSize: 100,
      fields: "files(id, name, mimeType, parents, webViewLink)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const folders: DriveFolder[] = [];
    const allFolderIds = new Set((response.data.files || []).map((f) => f.id!));

    // 親フォルダが結果に含まれていないフォルダ = ルートレベル
    for (const file of response.data.files || []) {
      const hasAccessibleParent = file.parents && file.parents.some((p) => allFolderIds.has(p));

      if (!hasAccessibleParent) {
        folders.push({
          id: file.id!,
          name: file.name!,
          mimeType: "application/vnd.google-apps.folder",
          parents: file.parents || undefined,
          webViewLink: file.webViewLink || undefined,
        });
      }
    }

    return folders;
  } catch {
    return [];
  }
}

/**
 * フォルダの内容を取得
 */
export async function listFolderContents(
  drive: drive_v3.Drive,
  folderId: string
): Promise<FolderContents> {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    pageSize: 100,
    fields: "nextPageToken, files(id, name, mimeType, parents, webViewLink, iconLink, modifiedTime, size)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    orderBy: "folder, name",
  });

  const files: DriveFile[] = [];
  const folders: DriveFolder[] = [];

  for (const file of response.data.files || []) {
    const item = {
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      parents: file.parents || undefined,
      webViewLink: file.webViewLink || undefined,
      iconLink: file.iconLink || undefined,
      modifiedTime: file.modifiedTime || undefined,
      size: file.size || undefined,
    };

    if (file.mimeType === FOLDER_MIME_TYPE) {
      folders.push(item as DriveFolder);
    } else {
      files.push(item);
    }
  }

  return { files, folders };
}

/**
 * フォルダ情報を取得
 */
export async function getFolderInfo(
  drive: drive_v3.Drive,
  folderId: string
): Promise<DriveFolder | null> {
  try {
    const response = await drive.files.get({
      fileId: folderId,
      fields: "id, name, mimeType, parents, webViewLink",
      supportsAllDrives: true,
    });

    if (response.data.mimeType !== FOLDER_MIME_TYPE) return null;

    return {
      id: response.data.id!,
      name: response.data.name!,
      mimeType: FOLDER_MIME_TYPE,
      parents: response.data.parents || undefined,
      webViewLink: response.data.webViewLink || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * フォルダのパスを取得（親フォルダを辿る）
 */
export async function getFolderPath(drive: drive_v3.Drive, folderId: string): Promise<string> {
  const pathParts: string[] = [];
  let currentId = folderId;

  for (let i = 0; i < 10; i++) {
    try {
      const response = await drive.files.get({
        fileId: currentId,
        fields: "id, name, parents",
        supportsAllDrives: true,
      });

      pathParts.unshift(response.data.name!);

      if (!response.data.parents || response.data.parents.length === 0) break;
      currentId = response.data.parents[0];
    } catch {
      break;
    }
  }

  return "/" + pathParts.join("/");
}
```

---

## 4. APIエンドポイント

### 4.1 フォルダ一覧取得 (`/api/workspace/drive/folders/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDriveClientForWorkspace,
  listSharedDrives,
  listAccessibleRootFolders,
  listFolderContents,
  listSharedDriveContents,
  getFolderInfo,
  getFolderPath,
} from "@/lib/google-drive";

/**
 * GET /api/workspace/drive/folders
 *
 * Query params:
 * - workspaceId: ワークスペースID (必須)
 * - folderId: フォルダID (任意、指定しない場合は共有ドライブ/フォルダ一覧)
 * - driveId: 共有ドライブID (任意)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const folderId = searchParams.get("folderId");
  const driveId = searchParams.get("driveId");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const supabase = await createClient();

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ワークスペースメンバーシップ確認
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Driveクライアント取得
  const drive = await getDriveClientForWorkspace(workspaceId);
  if (!drive) {
    return NextResponse.json({ error: "Google Drive is not connected" }, { status: 400 });
  }

  // ルートレベル: 共有ドライブと共有フォルダ一覧
  if (!folderId && !driveId) {
    const [sharedDrives, rootFolders] = await Promise.all([
      listSharedDrives(drive),
      listAccessibleRootFolders(drive),
    ]);
    return NextResponse.json({
      type: "root",
      sharedDrives,
      folders: rootFolders,
      files: [],
    });
  }

  // 共有ドライブのルート
  if (driveId && !folderId) {
    const contents = await listSharedDriveContents(drive, driveId);
    return NextResponse.json({ type: "folder", driveId, ...contents });
  }

  // フォルダ内容取得
  if (folderId) {
    const [folderInfo, contents, path] = await Promise.all([
      getFolderInfo(drive, folderId),
      listFolderContents(drive, folderId),
      getFolderPath(drive, folderId),
    ]);

    if (!folderInfo) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    return NextResponse.json({ type: "folder", folder: folderInfo, path, ...contents });
  }

  return NextResponse.json({ folders: [], files: [] });
}
```

---

## 5. フロントエンド統合

### 5.1 データ階層

```
Workspace
├── google_service_account_encrypted  # Service Account JSON (暗号化)
├── google_drive_connected            # 接続状態フラグ
│
└── Programs
    ├── google_drive_root_id          # プログラムのルートフォルダID
    ├── google_drive_root_name        # ルートフォルダ名
    │
    └── Teams
        ├── output_directory_id       # 出力先フォルダID
        ├── output_directory_name     # 出力先フォルダ名
        │
        └── team_file_refs            # 参照ファイル/フォルダ
            ├── ref_type              # "file" | "folder"
            ├── drive_id              # Google Drive ID
            ├── drive_name            # ファイル/フォルダ名
            └── include_subfolders    # サブフォルダを含むか
```

### 5.2 Program設定でのルートフォルダ選択

プログラム設定画面では、ワークスペースのService Accountがアクセス可能な全ての共有ドライブ/フォルダからルートフォルダを選択できます。

**UI動作:**
- タブで「共有フォルダ」と「共有ドライブ」を切り替え
- シングルクリックで選択、ダブルクリックでフォルダ内に移動
- 選択確定時にDBに保存

### 5.3 Team設定でのファイル/フォルダ選択

チーム設定画面では、**プログラムのルートフォルダ配下のみ**からファイル/フォルダを選択できます。

**参照ファイル/フォルダ:**
- 複数選択可能
- フォルダの場合「サブフォルダを含む」オプションあり
- `team_file_refs`テーブルに保存

**出力先フォルダ:**
- 1つのみ選択可能
- `teams.output_directory_id/name`に保存

**UI動作:**
- ブレッドクラムにプログラムのルートフォルダ名を表示
- プログラムのルートフォルダより上には移動不可
- ルートフォルダ未設定時はエラーメッセージとプログラム設定へのリンクを表示

---

## 6. データベーススキーマ

### 6.1 関連テーブル

```sql
-- programs table
CREATE TABLE programs (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  title TEXT NOT NULL,
  -- ... other fields ...
  google_drive_root_id TEXT,           -- プログラムルートフォルダのDrive ID
  google_drive_root_name TEXT          -- フォルダ名（表示用）
);

-- teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  program_id UUID REFERENCES programs(id),
  name TEXT NOT NULL,
  -- ... other fields ...
  output_directory_id TEXT,            -- 出力先フォルダのDrive ID
  output_directory_name TEXT,          -- フォルダ名（表示用）
  output_directory_url TEXT            -- Drive上のURL
);

-- team_file_refs table (参照ファイル/フォルダ)
CREATE TABLE team_file_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  ref_type TEXT NOT NULL CHECK (ref_type IN ('file', 'folder')),
  drive_id TEXT NOT NULL,              -- Google Drive ID
  drive_name TEXT NOT NULL,            -- ファイル/フォルダ名
  drive_path TEXT,                     -- パス（オプション）
  drive_url TEXT,                      -- Drive上のURL
  mime_type TEXT,                      -- MIMEタイプ
  include_subfolders BOOLEAN DEFAULT TRUE,  -- サブフォルダを含むか
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. セキュリティ

### 7.1 認証情報の保護

| 項目 | 対策 |
|------|------|
| Service Account JSON | 暗号化してDBに保存 (pgp_sym_encrypt) |
| 暗号化キー | 環境変数で管理 (GOOGLE_CREDENTIALS_ENCRYPTION_KEY) |
| 復号 | SECURITY DEFINER関数で実行、アプリ側にキーを渡さない |

### 7.2 アクセス制御

| レベル | 制御 |
|--------|------|
| API | ワークスペースメンバーシップ確認 |
| フォルダ | Service Accountに共有されたフォルダのみアクセス可能 |
| Team | プログラムのルートフォルダ配下のみ選択可能 |

### 7.3 API Scope

```typescript
scopes: [
  "https://www.googleapis.com/auth/drive.readonly",  // 読み取り専用
  "https://www.googleapis.com/auth/drive.file",      // 作成したファイルの管理
]
```

---

## 8. 今後の拡張

### 8.1 未実装機能

- [ ] ファイルコンテンツ取得API（テキスト抽出）
- [ ] Google Docs作成機能（成果物出力）
- [ ] @メンションからのファイル参照
- [ ] ファイル検索API
- [ ] ファイルプレビュー

### 8.2 実装予定のAPI

```typescript
// ファイルコンテンツ取得
GET /api/workspace/drive/files/{fileId}/content
// → Google Docs/Sheets/Slides/PDFからテキスト抽出

// ドキュメント作成
POST /api/workspace/drive/documents
// → 成果物をGoogle Docとして出力先フォルダに保存

// ファイル検索
GET /api/workspace/drive/search?q=query&folderId=xxx
// → フォルダ内のファイル名検索
```

---

## 9. 依存パッケージ

```json
// package.json
{
  "dependencies": {
    "googleapis": "^140.0.0"
  }
}
```

```bash
# 環境変数
GOOGLE_CREDENTIALS_ENCRYPTION_KEY=your-32-character-encryption-key
```
