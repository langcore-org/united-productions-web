# Google Drive連携 セットアップガイド

本ガイドでは、T-Agent PlatformでGoogle Drive連携を有効にするために必要な設定手順を説明します。

**アーキテクチャ**: Next.js Server Actions で直接Google APIを呼び出す構成

**認証方式**: Workspace単位でService Account JSONをDB保存（暗号化）

---

## 1. 前提条件

- Google Cloudアカウント（プロジェクト作成権限あり）
- Google Workspace または Google Driveへのアクセス権
- 連携対象フォルダの管理権限

---

## 2. Google Cloud Console設定

### 2.1 プロジェクト作成（既存プロジェクト使用可）

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新規プロジェクト作成 または 既存プロジェクトを選択

### 2.2 必要なAPIの有効化

以下の3つのAPIを有効化してください：

```
APIs & Services → Library → 検索して「ENABLE」
```

| API名 | 用途 |
|-------|------|
| **Google Drive API** | ファイル一覧・ダウンロード・アップロード |
| **Google Docs API** | Google Docsの読み書き |
| **Google Sheets API** | Spreadsheetの読み取り |

### 2.3 Service Account作成

```
APIs & Services → Credentials → Create Credentials → Service Account
```

1. **Service account name**: `t-agent-drive-access`（任意）
2. **Service account ID**: 自動生成（変更不要）
3. **Role**: 付与不要（フォルダ単位で権限管理）
4. 「Done」をクリック

### 2.4 認証キー（JSON）発行

1. 作成したService Accountをクリック
2. 「Keys」タブを選択
3. 「Add Key」→「Create new key」
4. **JSON**を選択して「Create」
5. ダウンロードされた`*.json`ファイルを安全に保管

**重要**: このJSONファイルは**絶対にGitリポジトリにコミットしない**こと

---

## 3. Service Accountのメールアドレス確認

発行したJSONファイル内の`client_email`を確認：

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "t-agent-drive-access@your-project-id.iam.gserviceaccount.com",
  ...
}
```

この`client_email`をGoogle Driveフォルダ共有に使用します。

---

## 4. Google Drive フォルダ共有設定

### 4.1 共有対象フォルダの決定

チームが参照するフォルダを決定します。推奨構成：

```
📁 T-Agent共有フォルダ (ルート)
├── 📁 入力ファイル
│   ├── 📄 企画書テンプレート.docx
│   ├── 📄 議事録_2024xxxx.gdoc
│   └── 📊 データ分析.gsheet
└── 📁 出力フォルダ
    └── (AIが作成したドキュメントがここに保存される)
```

### 4.2 フォルダIDの取得

対象フォルダをブラウザで開き、URLからIDを取得：

```
https://drive.google.com/drive/folders/1ABC123xyz789...
                                       ↑ これがフォルダID
```

### 4.3 Service Accountへの共有

1. 対象フォルダを右クリック →「共有」
2. Service AccountのEmail（`client_email`）を入力
3. 権限を選択：
   - **閲覧者**: 読み取りのみ（入力フォルダ推奨）
   - **編集者**: 読み書き両方（出力フォルダ必須）
4. 「送信」をクリック

---

## 5. Workspace設定（管理画面から）

### 5.1 設定画面でService Accountをアップロード

1. ワークスペースの設定画面（`/{workspace-slug}/settings/drive`）にアクセス
2. Service Account JSONファイルをドラッグ＆ドロップまたはクリックして選択
3. 自動バリデーション実行（必須フィールド・形式チェック）
4. フォルダID設定（任意）
   - 参照フォルダID: @メンションで参照可能なファイルの親フォルダ
   - 出力フォルダID: AI成果物の保存先
5. 「連携を開始する」をクリック

### 5.2 データベース保存

Service Account認証情報はSupabaseの`workspaces`テーブルに**暗号化**保存されます：

```sql
-- workspacesテーブルのカラム（マイグレーション追加済み）
google_service_account_encrypted  BYTEA     -- pgcryptoで暗号化
drive_settings                    JSONB     -- { rootFolderId, outputFolderId }
google_drive_connected            BOOLEAN   -- 接続状態フラグ
```

**暗号化/復号化関数**:
```sql
-- 暗号化
SELECT encrypt_service_account('{"type":"service_account",...}', 'encryption_key');

-- 復号化
SELECT decrypt_service_account(encrypted_bytes, 'encryption_key');

-- Workspace設定更新
SELECT set_workspace_service_account(workspace_id, json_text, encryption_key);

-- Workspace認証情報取得
SELECT get_workspace_service_account(workspace_id, encryption_key);
```

### 5.3 環境変数（暗号化キー）

```bash
# up_web/.env.local

# Service Account暗号化キー（本番環境では必ず32文字以上の安全な値に変更）
GOOGLE_CREDENTIALS_ENCRYPTION_KEY=your-32-character-encryption-key!
```

**重要**: この暗号化キーは環境変数として安全に管理してください

### 5.4 必要パッケージインストール

```bash
cd up_web
npm install googleapis
npm install pdf-parse    # PDF読み取り用
```

### 5.5 API エンドポイント

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/api/workspace/drive` | Service Account登録 |
| GET | `/api/workspace/drive?workspaceId=xxx` | 接続状態取得 |
| DELETE | `/api/workspace/drive` | 連携解除 |

---

## 6. 実装ファイル構成

```
up_web/src/
├── lib/
│   └── google-drive/
│       ├── auth.ts              # Service Account認証
│       ├── drive-service.ts     # Drive API操作
│       ├── content-extractor.ts # ファイル内容抽出
│       └── types.ts             # 型定義
├── app/
│   └── api/
│       └── drive/
│           ├── folders/
│           │   └── [id]/
│           │       └── route.ts  # GET /api/drive/folders/:id
│           ├── files/
│           │   └── [id]/
│           │       └── content/
│           │           └── route.ts  # GET /api/drive/files/:id/content
│           └── search/
│               └── route.ts      # GET /api/drive/search
```

---

## 7. 認証モジュール実装例

### 7.1 auth.ts

```typescript
// up_web/src/lib/google-drive/auth.ts
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

let cachedAuth: any = null;

export async function getGoogleAuth() {
  if (cachedAuth) return cachedAuth;

  let credentials: any;

  // 方法1: 環境変数からJSON直接読み込み
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }
  // 方法2: ファイルから読み込み
  else if (process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    const filePath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_FILE);
    const content = fs.readFileSync(filePath, 'utf-8');
    credentials = JSON.parse(content);
  } else {
    throw new Error('Google Service Account credentials not configured');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });

  cachedAuth = auth;
  return auth;
}

export async function getDriveClient() {
  const auth = await getGoogleAuth();
  return google.drive({ version: 'v3', auth });
}

export async function getDocsClient() {
  const auth = await getGoogleAuth();
  return google.docs({ version: 'v1', auth });
}

export async function getSheetsClient() {
  const auth = await getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}
```

### 7.2 types.ts

```typescript
// up_web/src/lib/google-drive/types.ts
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: number;
  webViewLink?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  files: DriveFile[];
  subfolders: DriveFolder[];
}

export interface FileContent {
  fileId: string;
  name: string;
  mimeType: string;
  content: string;
  metadata: {
    modifiedTime: string;
    webLink: string;
  };
}
```

### 7.3 drive-service.ts

```typescript
// up_web/src/lib/google-drive/drive-service.ts
import { getDriveClient } from './auth';
import type { DriveFile } from './types';

export async function listFolder(folderId: string): Promise<DriveFile[]> {
  const drive = await getDriveClient();

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    pageSize: 100,
    fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink)',
    orderBy: 'modifiedTime desc',
  });

  return (response.data.files || []) as DriveFile[];
}

export async function getFileMetadata(fileId: string): Promise<DriveFile> {
  const drive = await getDriveClient();

  const response = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, modifiedTime, size, webViewLink',
  });

  return response.data as DriveFile;
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = await getDriveClient();

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

export async function exportGoogleDoc(
  fileId: string,
  mimeType: string = 'text/plain'
): Promise<string> {
  const drive = await getDriveClient();

  const response = await drive.files.export({
    fileId,
    mimeType,
  });

  return response.data as string;
}

export async function searchFiles(
  query: string,
  folderId?: string
): Promise<DriveFile[]> {
  const drive = await getDriveClient();

  let searchQuery = `name contains '${query}' and trashed = false`;
  if (folderId) {
    searchQuery = `'${folderId}' in parents and ${searchQuery}`;
  }

  const response = await drive.files.list({
    q: searchQuery,
    pageSize: 20,
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
  });

  return (response.data.files || []) as DriveFile[];
}
```

---

## 8. API Route実装例

### 8.1 フォルダ一覧 API

```typescript
// up_web/src/app/api/drive/folders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { listFolder } from '@/lib/google-drive/drive-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const files = await listFolder(params.id);
    return NextResponse.json(files);
  } catch (error: any) {
    console.error('Drive API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list folder' },
      { status: 500 }
    );
  }
}
```

### 8.2 ファイル内容取得 API

```typescript
// up_web/src/app/api/drive/files/[id]/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFileMetadata, exportGoogleDoc, downloadFile } from '@/lib/google-drive/drive-service';
import type { FileContent } from '@/lib/google-drive/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const metadata = await getFileMetadata(params.id);
    let content: string;

    // Google Workspace形式はexport
    if (metadata.mimeType.includes('google-apps.document')) {
      content = await exportGoogleDoc(params.id, 'text/plain');
    } else if (metadata.mimeType.includes('google-apps.spreadsheet')) {
      content = await exportGoogleDoc(params.id, 'text/csv');
    } else if (metadata.mimeType.includes('google-apps.presentation')) {
      content = await exportGoogleDoc(params.id, 'text/plain');
    }
    // 通常ファイルはダウンロード
    else if (metadata.mimeType === 'text/plain' || metadata.mimeType.includes('text/')) {
      const buffer = await downloadFile(params.id);
      content = buffer.toString('utf-8');
    }
    // PDFはテキスト抽出（pdf-parse使用）
    else if (metadata.mimeType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = await downloadFile(params.id);
      const data = await pdfParse(buffer);
      content = data.text;
    }
    // 未対応形式
    else {
      return NextResponse.json(
        { error: `Unsupported file type: ${metadata.mimeType}` },
        { status: 400 }
      );
    }

    const result: FileContent = {
      fileId: params.id,
      name: metadata.name,
      mimeType: metadata.mimeType,
      content,
      metadata: {
        modifiedTime: metadata.modifiedTime || '',
        webLink: metadata.webViewLink || '',
      },
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('File content error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get file content' },
      { status: 500 }
    );
  }
}
```

---

## 9. 動作確認チェックリスト

### 9.1 サーバー起動

```bash
cd up_web
npm run dev
```

### 9.2 API テスト

```bash
# フォルダ一覧取得
curl "http://localhost:3100/api/drive/folders/{YOUR_FOLDER_ID}"

# ファイル内容取得
curl "http://localhost:3100/api/drive/files/{YOUR_FILE_ID}/content"
```

期待レスポンス（フォルダ一覧）：
```json
[
  {
    "id": "1xyz...",
    "name": "企画書テンプレート.gdoc",
    "mimeType": "application/vnd.google-apps.document",
    "modifiedTime": "2024-01-15T10:30:00Z"
  }
]
```

### 9.3 チャット統合確認

1. チャット画面で `@` を入力
2. ファイルピッカーが表示される
3. ファイル選択 → 内容がプロンプトに添付される

---

## 10. トラブルシューティング

### エラー: 403 Forbidden

**原因**: Service Accountにフォルダ共有がされていない

**解決**:
1. Google Driveで対象フォルダを開く
2. Service AccountのEmailで共有設定を確認
3. 権限レベル（閲覧者/編集者）を確認

### エラー: GOOGLE_SERVICE_ACCOUNT credentials not configured

**原因**: 環境変数が設定されていない

**解決**:
```bash
# .env.local確認
cat up_web/.env.local | grep GOOGLE

# ファイル存在確認
ls -la up_web/credentials/
```

### エラー: API has not been enabled

**原因**: 必要なAPIが有効化されていない

**解決**:
1. Google Cloud Console → APIs & Services → Library
2. Drive API / Docs API / Sheets API を検索
3. 「ENABLE」ボタンで有効化

### エラー: Rate Limit Exceeded

**原因**: APIクォータ超過

**解決**:
- 短期: 数分待ってから再試行
- 長期: Cloud Consoleでクォータ増加申請

---

## 11. セキュリティベストプラクティス

| 項目 | 推奨設定 |
|------|----------|
| 認証ファイル保管 | Vercel等では環境変数にJSON埋め込み |
| フォルダ共有 | 必要最小限のフォルダのみ共有 |
| 権限レベル | 入力フォルダは「閲覧者」、出力フォルダのみ「編集者」 |
| アクセスログ | Cloud Loggingで監査ログ有効化 |
| キーローテーション | 90日ごとにService Accountキー更新推奨 |

---

## 12. 設定完了後の構成図

```
┌────────────────────────────────────────────────────────────┐
│                     Google Cloud                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Service Account: t-agent-drive-access@...           │  │
│  │  APIs: Drive API, Docs API, Sheets API (ENABLED)     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
                              │
                              │ 認証 (service-account.json)
                              ▼
┌────────────────────────────────────────────────────────────┐
│  up_web/ (Next.js)                                      │
│  ├── credentials/service-account.json                      │
│  ├── .env.local (GOOGLE_SERVICE_ACCOUNT_FILE)              │
│  ├── src/lib/google-drive/  (認証・API操作)                 │
│  └── src/app/api/drive/     (API Routes)                   │
│      ├── folders/[id]/route.ts                             │
│      ├── files/[id]/content/route.ts                       │
│      └── search/route.ts                                   │
└────────────────────────────────────────────────────────────┘
                              │
                              │ 共有設定
                              ▼
┌────────────────────────────────────────────────────────────┐
│  Google Drive                                              │
│  ├── 📁 入力フォルダ (閲覧者権限)                           │
│  └── 📁 出力フォルダ (編集者権限)                           │
└────────────────────────────────────────────────────────────┘
```

---

## クイックスタートチェックリスト

- [ ] Google Cloud プロジェクト作成/選択
- [ ] Drive API / Docs API / Sheets API 有効化
- [ ] Service Account 作成
- [ ] JSONキーファイル発行・保存
- [ ] `up_web/credentials/service-account.json` に配置
- [ ] `.gitignore` に `credentials/` 追加
- [ ] `up_web/.env.local` に環境変数設定
- [ ] `npm install googleapis pdf-parse` 実行
- [ ] Google Driveで対象フォルダをService Accountに共有
- [ ] APIテスト実行（`/api/drive/folders/{id}`）
