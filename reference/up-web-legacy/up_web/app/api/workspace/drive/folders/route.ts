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
  getCachedFolderContents,
  prefetchChildFolders,
} from "@/lib/google-drive";

/**
 * GET /api/workspace/drive/folders
 * Google Driveのフォルダ一覧を取得（キャッシュ対応）
 *
 * Query params:
 * - workspaceId: ワークスペースID (必須)
 * - folderId: フォルダID (任意、指定しない場合は共有ドライブ一覧)
 * - driveId: 共有ドライブID (任意、共有ドライブのルートを取得する場合)
 * - refresh: true でキャッシュをスキップ
 * - prefetch: false でプリフェッチを無効化（デフォルトtrue）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const folderId = searchParams.get("folderId");
    const driveId = searchParams.get("driveId");
    const refresh = searchParams.get("refresh") === "true";
    const prefetch = searchParams.get("prefetch") !== "false"; // Default: true

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get Drive client
    const drive = await getDriveClientForWorkspace(workspaceId);
    if (!drive) {
      return NextResponse.json(
        { error: "Google Drive is not connected" },
        { status: 400 }
      );
    }

    // If no folderId specified, return shared drives and accessible root folders
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

    // If driveId specified (shared drive root)
    if (driveId && !folderId) {
      const contents = await getCachedFolderContents(
        { workspaceId, folderId: driveId, skipCache: refresh },
        () => listSharedDriveContents(drive, driveId)
      );

      // Trigger pre-fetch for child folders (fire-and-forget)
      if (prefetch && contents.folders.length > 0) {
        prefetchChildFolders(
          workspaceId,
          driveId,
          contents.folders,
          (id) => listFolderContents(drive, id)
        ).catch((e) => console.debug("Prefetch error:", e));
      }

      return NextResponse.json(
        {
          type: "folder",
          driveId,
          ...contents,
        },
        {
          headers: {
            "X-Cache": contents.fromCache ? "HIT" : "MISS",
            ...(contents.cachedAt && { "X-Cached-At": contents.cachedAt }),
          },
        }
      );
    }

    // Get folder contents
    if (folderId) {
      // Fetch function that includes folderInfo and path
      const fetchWithMetadata = async () => {
        const [folderContents, folderInfo, path] = await Promise.all([
          listFolderContents(drive, folderId),
          getFolderInfo(drive, folderId),
          getFolderPath(drive, folderId),
        ]);
        return {
          ...folderContents,
          folderInfo,
          path,
        };
      };

      // Get cached contents (includes folderInfo and path)
      const contents = await getCachedFolderContents(
        { workspaceId, folderId, skipCache: refresh },
        fetchWithMetadata
      );

      // Check if folder exists (on cache miss, folderInfo was fetched)
      if (!contents.fromCache && !contents.folderInfo) {
        return NextResponse.json(
          { error: "Folder not found or not accessible" },
          { status: 404 }
        );
      }

      // Trigger pre-fetch for child folders (fire-and-forget)
      if (prefetch && contents.folders.length > 0) {
        prefetchChildFolders(
          workspaceId,
          folderId,
          contents.folders,
          (id) => listFolderContents(drive, id)
        ).catch((e) => console.debug("Prefetch error:", e));
      }

      return NextResponse.json(
        {
          type: "folder",
          folder: contents.folderInfo,
          path: contents.path,
          ...contents,
        },
        {
          headers: {
            "X-Cache": contents.fromCache ? "HIT" : "MISS",
            ...(contents.cachedAt && { "X-Cached-At": contents.cachedAt }),
          },
        }
      );
    }

    return NextResponse.json({ folders: [], files: [] });
  } catch (error) {
    console.error("Error in GET /api/workspace/drive/folders:", error);
    const err = error as { message?: string };

    return NextResponse.json(
      { error: err.message || "Failed to list folders" },
      { status: 500 }
    );
  }
}
