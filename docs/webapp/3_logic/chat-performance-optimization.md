# Chat Performance Optimization

チャットページのパフォーマンス最適化に関する実装ドキュメント。

## 概要

チャットページ (`/[slug]/programs/[programId]/teams/[teamId]/chat`) のパフォーマンス問題を解決。

| 問題 | 原因 | 解決策 |
|------|------|--------|
| Sidebarフォルダ読み込みが遅い | 毎回Drive API呼び出し | 2層キャッシュ + プリフェッチ |
| @mentionファイル一覧が遅い | 再帰的API呼び出し | DBキャッシュ + 並列処理 |
| ファイル内容の抽出が遅い | - | Next.js API Route で抽出 |

---

## 1. 2層キャッシュアーキテクチャ

### キャッシュ構成

```
┌─────────────────────────────────────────────────────────┐
│  L1: Frontend Memory Cache (60秒 TTL)                   │
│  - 同一ページ内での即時レスポンス                        │
│  - useFolderTree hook内のMap                            │
└─────────────────────────────────────────────────────────┘
                         ↓ cache miss
┌─────────────────────────────────────────────────────────┐
│  L2: Supabase PostgreSQL Cache (5分 TTL)                │
│  - drive_folder_cache テーブル                          │
│  - サーバー間で共有可能                                  │
│  - Stale-While-Revalidate パターン                      │
└─────────────────────────────────────────────────────────┘
                         ↓ cache miss
┌─────────────────────────────────────────────────────────┐
│  Google Drive API                                       │
│  - listFolderContents()                                 │
│  - getFolderInfo()                                      │
│  - getFolderPath()                                      │
└─────────────────────────────────────────────────────────┘
```

### パフォーマンス改善

| シナリオ | Before | After |
|----------|--------|-------|
| 初回フォルダ読み込み | 3-5秒 | 2-3秒 |
| 2回目以降 (キャッシュHIT) | 3-5秒 | **~100ms** |
| @mention一覧読み込み | 20秒以上 | **~100ms** (キャッシュHIT) |

---

## 2. Drive Folder Cache (L2)

### データベーススキーマ

**Migration**: `supabase/migrations/20251220115000_drive_folder_cache.sql`

```sql
CREATE TABLE drive_folder_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL,

  -- キャッシュデータ (フォルダ情報・パス含む)
  children_json JSONB NOT NULL DEFAULT '{"folders":[],"files":[]}'::jsonb,

  -- 自動計算カラム
  folder_count INTEGER GENERATED ALWAYS AS
    (jsonb_array_length(COALESCE(children_json->'folders', '[]'::jsonb))) STORED,
  file_count INTEGER GENERATED ALWAYS AS
    (jsonb_array_length(COALESCE(children_json->'files', '[]'::jsonb))) STORED,

  -- TTL管理
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes'),

  -- 同時更新制御 (Thundering Herd防止)
  is_refreshing BOOLEAN DEFAULT false,
  refresh_started_at TIMESTAMPTZ,

  UNIQUE(workspace_id, folder_id)
);
```

### キャッシュデータ構造

```typescript
interface CachedData {
  folders: DriveFolder[];
  files: DriveFile[];
  folderInfo?: DriveFile;  // フォルダメタデータ
  path?: string;           // フルパス
}
```

### RPC Functions

| Function | Purpose |
|----------|---------|
| `get_or_lock_folder_cache()` | キャッシュ取得 or ロック獲得 |
| `update_folder_cache()` | キャッシュ更新 + ロック解除 |
| `invalidate_folder_cache()` | キャッシュ無効化 |

### キャッシュサービス

**File**: `lib/google-drive/folder-cache.ts`

```typescript
export async function getCachedFolderContents(
  options: FolderCacheOptions,
  fetchFn: () => Promise<FolderContents>
): Promise<CachedFolderContents> {
  // 1. skipCache=true ならフェッチ直行
  if (skipCache) {
    const contents = await fetchFn();
    tryUpdateCache(workspaceId, folderId, contents, ttlSeconds);
    return { ...contents, fromCache: false };
  }

  // 2. L2キャッシュ確認
  const { data: cacheResult } = await supabase.rpc("get_or_lock_folder_cache", {
    p_workspace_id: workspaceId,
    p_folder_id: folderId,
    p_ttl_seconds: ttlSeconds,
  });

  // 3. キャッシュHIT → 即時返却
  if (result?.cache_hit && result?.children_json) {
    return {
      folders: cached.folders || [],
      files: cached.files || [],
      folderInfo: cached.folderInfo,
      path: cached.path,
      fromCache: true,
    };
  }

  // 4. キャッシュMISS → フェッチ & 保存
  const contents = await fetchFn();
  await updateFolderCacheInternal(supabase, workspaceId, folderId, contents, ttlSeconds);
  return { ...contents, fromCache: false };
}
```

---

## 3. Team Expanded Files Cache

@mention ピッカー用のプリ展開済みファイル一覧キャッシュ。

### データベーススキーマ

**Migration**: `supabase/migrations/20251220120000_team_expanded_files.sql`

```sql
-- 展開済みファイルキャッシュ
CREATE TABLE team_expanded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  ref_type file_ref_type_enum NOT NULL,  -- 'file' | 'folder'
  drive_id TEXT NOT NULL,
  drive_name TEXT NOT NULL,
  drive_path TEXT,
  mime_type TEXT,
  display_order INTEGER DEFAULT 0,

  UNIQUE(team_id, drive_id)
);

-- キャッシュメタデータ
CREATE TABLE team_file_cache_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID UNIQUE NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  last_refreshed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_refreshing BOOLEAN DEFAULT false,
  refresh_started_at TIMESTAMPTZ,

  total_files INTEGER DEFAULT 0,
  total_folders INTEGER DEFAULT 0,
  error_message TEXT
);
```

### API Endpoint

**File**: `app/api/teams/[teamId]/files/route.ts`

```typescript
// GET /api/teams/[teamId]/files
// キャッシュ済みファイル一覧を取得

export async function GET(request: NextRequest, { params }) {
  const { teamId } = await params;

  // 1. キャッシュ確認
  const { data: cacheResult } = await supabase.rpc("get_team_expanded_files", {
    p_team_id: teamId,
    p_ttl_seconds: CACHE_TTL_SECONDS,  // 5分
  });

  // 2. 有効なキャッシュあり → 即時返却
  if (cache.cache_valid && !cache.is_stale) {
    return NextResponse.json({
      files: cache.files,
      fromCache: true,
    });
  }

  // 3. 古いキャッシュ → 返却 + バックグラウンド更新
  if (cache.files?.length > 0) {
    refreshTeamFilesBackground(teamId, supabase);  // fire-and-forget
    return NextResponse.json({
      files: cache.files,
      fromCache: true,
      isStale: true,
    });
  }

  // 4. キャッシュなし → フル更新
  const files = await refreshTeamFiles(teamId, supabase);
  return NextResponse.json({ files, fromCache: false });
}

// POST /api/teams/[teamId]/files
// キャッシュ強制更新
export async function POST(request: NextRequest, { params }) {
  const files = await refreshTeamFiles(teamId, supabase);
  return NextResponse.json({ success: true, files });
}
```

### Chat ページでの使用

**File**: `app/[slug]/programs/[programId]/teams/[teamId]/chat/page.tsx`

```typescript
// 従来: 再帰的fetchFolderContents (20秒+)
// 新規: 単一APIコール (~100ms)

const filesRes = await fetch(`/api/teams/${teamId}/files`);
if (filesRes.ok) {
  const filesData = await filesRes.json();
  const teamFileRefs: TeamFileRef[] = (filesData.files || []).map(
    (file: ExpandedFile) => ({
      id: file.drive_id,
      ref_type: file.ref_type,
      drive_id: file.drive_id,
      drive_name: file.drive_name,
      drive_path: file.drive_path,
      mime_type: file.mime_type,
      include_subfolders: false,
    })
  );
  setTeamFiles(teamFileRefs);
}
```

---

## 4. プリフェッチ

### Sidebar Folder Tree

フォルダ展開時に子フォルダを事前取得。

**File**: `lib/google-drive/folder-cache.ts`

```typescript
export async function prefetchChildFolders(
  workspaceId: string,
  parentFolderId: string,
  folders: DriveFolder[],
  fetchFn: (folderId: string) => Promise<FolderContents>,
  depth: number = 1
): Promise<void> {
  const PREFETCH_DEPTH = 2;        // 2階層まで
  const MAX_CONCURRENT = 5;        // 同時5件まで

  if (depth > PREFETCH_DEPTH) return;

  // 未キャッシュのフォルダのみ対象
  const uncachedFolders = folders.filter(f => !isCached(f.id));

  // 並列でプリフェッチ
  await Promise.allSettled(
    uncachedFolders.slice(0, MAX_CONCURRENT).map(async (folder) => {
      const contents = await getCachedFolderContents(
        { workspaceId, folderId: folder.id },
        () => fetchFn(folder.id)
      );

      // 再帰的にプリフェッチ
      if (contents.folders.length > 0) {
        await prefetchChildFolders(..., depth + 1);
      }
    })
  );
}
```

### ホバープリフェッチ

**File**: `components/sidebar/FolderTreeItem.tsx`

```typescript
// 200msホバーでプリフェッチ開始
const handleMouseEnter = () => {
  if (isFolder && onHover) {
    hoverTimer = setTimeout(onHover, 200);
  }
};
```

---

## 5. スプレッドシートフィルタリング

AIが処理困難な非構造化スプレッドシートを非表示。

### フィルタ対象

| MIME Type | ファイル種別 |
|-----------|-------------|
| `application/vnd.google-apps.spreadsheet` | Google Sheets |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | .xlsx |
| `application/vnd.ms-excel` | .xls |
| `application/vnd.oasis.opendocument.spreadsheet` | .ods |

### 実装箇所

**File**: `lib/google-drive/client.ts`

```typescript
const EXCLUDED_MIME_TYPES = new Set([
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.oasis.opendocument.spreadsheet",
]);

// listFolderContents, listSharedDriveContents 内
for (const file of response.data.files || []) {
  if (EXCLUDED_MIME_TYPES.has(file.mimeType!)) {
    continue;  // スキップ
  }
  // ...
}
```

**File**: `app/api/teams/[teamId]/files/route.ts`

```typescript
// 直接ファイル参照
if (ref.mime_type && EXCLUDED_MIME_TYPES.has(ref.mime_type)) {
  return;  // スキップ
}

// expandFolder内
if (EXCLUDED_MIME_TYPES.has(file.mimeType)) {
  continue;  // スキップ
}
```

---

## 6. L1 メモリキャッシュ

フロントエンド側のメモリキャッシュ。

**File**: `hooks/useFolderTree.ts`

```typescript
const L1_TTL_MS = 60000;  // 60秒

// モジュールレベルキャッシュ (ページ内共有)
const l1Cache = new Map<string, CacheEntry>();

interface CacheEntry {
  data: FolderState;
  timestamp: number;
}

// キャッシュ取得
const getFromL1Cache = (folderId: string): FolderState | null => {
  const key = `${workspaceId}:${folderId}`;
  const entry = l1Cache.get(key);

  if (!entry) return null;
  if (Date.now() - entry.timestamp > L1_TTL_MS) {
    l1Cache.delete(key);
    return null;
  }

  return entry.data;
};

// キャッシュ保存
const saveToL1Cache = (folderId: string, data: FolderState) => {
  const key = `${workspaceId}:${folderId}`;
  l1Cache.set(key, { data, timestamp: Date.now() });
};
```

---

## 7. キャッシュ設計まとめ

### TTL設定

| Layer | Location | TTL | Purpose |
|-------|----------|-----|---------|
| L1 | Frontend Memory | 60秒 | 同一ページ内即時レスポンス |
| L2 | Supabase DB | 5分 | サーバー間共有、永続化 |
| Team Files | Supabase DB | 5分 | @mention用プリ展開一覧 |

### Stale-While-Revalidate

1. 期限切れキャッシュでも古いデータを即時返却
2. バックグラウンドで新しいデータをフェッチ
3. 次回リクエストで新しいデータを返却

### Thundering Herd 防止

```sql
-- ロック取得
UPDATE drive_folder_cache
SET is_refreshing = true, refresh_started_at = NOW()
WHERE workspace_id = ? AND folder_id = ?
  AND (is_refreshing = false OR refresh_started_at < NOW() - INTERVAL '2 minutes');
```

- 同時リフレッシュを1プロセスに制限
- タイムアウト (2分) でロック自動解除

---

## 8. ファイル内容抽出 API

### 実装

**File**: `app/api/chat/extract-content/route.ts`

チャットに添付されたファイルの内容を抽出し、Claude Code に送信。

### 対応MIMEタイプ

| MIMEタイプ | ファイル種別 | 抽出方法 |
|------------|-------------|----------|
| `application/vnd.google-apps.document` | Google Docs | Export as text/plain |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | .docx | mammoth |
| `application/pdf` | PDF | pdf-parse |
| `text/plain`, `text/markdown`, etc. | テキスト系 | UTF-8 decode |

### 制限事項

- `MAX_CONTENT_LENGTH = 50000` (50KB)
- 超過時は `truncated: true` を返却

---

## 9. 関連ファイル

### Backend

| ファイル | 役割 |
|----------|------|
| `lib/google-drive/client.ts` | Drive API クライアント + フィルタ |
| `lib/google-drive/folder-cache.ts` | L2キャッシュサービス |
| `app/api/workspace/drive/folders/route.ts` | フォルダAPI (キャッシュ統合) |
| `app/api/teams/[teamId]/files/route.ts` | Team Files API |
| `app/api/chat/extract-content/route.ts` | ファイル内容抽出 |

### Frontend

| ファイル | 役割 |
|----------|------|
| `hooks/useFolderTree.ts` | L1メモリキャッシュ + フック |
| `components/sidebar/FolderTree.tsx` | ツリーコンポーネント |
| `components/sidebar/FolderTreeItem.tsx` | ホバープリフェッチ |
| `app/[slug]/.../chat/page.tsx` | チャットページ |

### Database

| ファイル | 役割 |
|----------|------|
| `supabase/migrations/20251220115000_drive_folder_cache.sql` | L2キャッシュテーブル |
| `supabase/migrations/20251220120000_team_expanded_files.sql` | Team Filesキャッシュ |

---

## 10. 運用

### キャッシュクリア

```sql
-- 全キャッシュクリア
TRUNCATE drive_folder_cache;
TRUNCATE team_expanded_files;
UPDATE team_file_cache_meta SET last_refreshed_at = NULL, expires_at = NULL;

-- 特定ワークスペースのみ
DELETE FROM drive_folder_cache WHERE workspace_id = '...';
```

### 手動リフレッシュ

```bash
# Sidebar フォルダ
curl "/api/workspace/drive/folders?workspaceId=...&folderId=...&refresh=true"

# Team Files
curl -X POST "/api/teams/{teamId}/files"
```

### 監視

```sql
-- キャッシュ状態確認
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_refreshing = true) as locked,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as valid
FROM drive_folder_cache;
```
