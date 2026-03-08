import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDriveClientForWorkspace,
  listFolderContents,
  getCachedFolderContents,
} from "@/lib/google-drive";

interface TeamFileRef {
  id: string;
  ref_type: "file" | "folder";
  drive_id: string;
  drive_name: string;
  drive_path: string | null;
  mime_type: string | null;
  include_subfolders: boolean;
  display_order: number;
}

interface ExpandedFile {
  ref_type: "file" | "folder";
  drive_id: string;
  drive_name: string;
  drive_path: string;
  mime_type: string | null;
  display_order: number;
}

const CACHE_TTL_SECONDS = 300; // 5 minutes
const MAX_DEPTH = 4;

// Spreadsheet MIME types to exclude (AI cannot process unstructured spreadsheets well)
const EXCLUDED_MIME_TYPES = new Set([
  "application/vnd.google-apps.spreadsheet", // Google Sheets
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "application/vnd.oasis.opendocument.spreadsheet", // .ods
]);

/**
 * GET /api/teams/[teamId]/files
 * Get expanded file list for team (cached)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") === "true";

    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If not forcing refresh, try to get from cache first
    if (!refresh) {
      const { data: cacheResult, error: cacheError } = await supabase.rpc(
        "get_team_expanded_files",
        {
          p_team_id: teamId,
          p_ttl_seconds: CACHE_TTL_SECONDS,
        }
      );

      if (!cacheError && cacheResult?.[0]) {
        const cache = cacheResult[0];

        // Cache is valid and not stale
        if (cache.cache_valid && !cache.is_stale) {
          return NextResponse.json({
            files: cache.files || [],
            fromCache: true,
            lastRefreshedAt: cache.last_refreshed_at,
          });
        }

        // Cache exists but is stale - return stale data and trigger background refresh
        if (cache.files && cache.files.length > 0) {
          // Trigger background refresh (fire-and-forget)
          refreshTeamFilesBackground(teamId, supabase).catch(console.error);

          return NextResponse.json({
            files: cache.files,
            fromCache: true,
            isStale: true,
            lastRefreshedAt: cache.last_refreshed_at,
          });
        }
      }
    }

    // No cache or refresh requested - fetch fresh data
    const files = await refreshTeamFiles(teamId, supabase);

    return NextResponse.json({
      files,
      fromCache: false,
      lastRefreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in GET /api/teams/[teamId]/files:", error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to get team files" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teams/[teamId]/files
 * Force refresh team file cache
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;

    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Refresh the cache
    const files = await refreshTeamFiles(teamId, supabase);

    return NextResponse.json({
      success: true,
      files,
      lastRefreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in POST /api/teams/[teamId]/files:", error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to refresh team files" },
      { status: 500 }
    );
  }
}

/**
 * Background refresh (fire-and-forget)
 */
async function refreshTeamFilesBackground(
  teamId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  try {
    // Try to acquire lock
    const { data: locked } = await supabase.rpc("lock_team_file_cache", {
      p_team_id: teamId,
    });

    if (!locked) {
      // Another process is already refreshing
      return;
    }

    await refreshTeamFiles(teamId, supabase);
  } catch (error) {
    console.error("Background refresh failed:", error);
    // Release lock on error
    await supabase.rpc("release_team_file_cache_lock", {
      p_team_id: teamId,
      p_error_message: (error as Error).message,
    });
  }
}

/**
 * Refresh team files cache
 */
async function refreshTeamFiles(
  teamId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ExpandedFile[]> {
  // Get team and program info
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select(
      `
      id,
      program:programs!inner(
        id, workspace_id
      )
    `
    )
    .eq("id", teamId)
    .single();

  if (teamError || !team) {
    throw new Error("Team not found");
  }

  // Get workspace_id from program (Supabase returns the relation as an object)
  const program = team.program as unknown as { workspace_id: string };
  const workspaceId = program.workspace_id;

  // Get team file refs
  const { data: fileRefs, error: refsError } = await supabase
    .from("team_file_refs")
    .select("*")
    .eq("team_id", teamId)
    .order("display_order");

  if (refsError) {
    throw new Error("Failed to get team file refs");
  }

  if (!fileRefs || fileRefs.length === 0) {
    // No file refs - save empty cache
    await supabase.rpc("update_team_expanded_files", {
      p_team_id: teamId,
      p_files: [],
      p_ttl_seconds: CACHE_TTL_SECONDS,
    });
    return [];
  }

  // Get Drive client
  const drive = await getDriveClientForWorkspace(workspaceId);
  if (!drive) {
    throw new Error("Google Drive not connected");
  }

  // Expand all file refs
  const allFiles: ExpandedFile[] = [];
  let displayOrder = 0;

  // Process file refs in parallel
  await Promise.all(
    fileRefs.map(async (ref: TeamFileRef) => {
      if (ref.ref_type === "file") {
        // Skip hidden files (starting with .)
        if (ref.drive_name?.startsWith(".")) {
          return;
        }
        // Skip excluded MIME types (spreadsheets)
        if (ref.mime_type && EXCLUDED_MIME_TYPES.has(ref.mime_type)) {
          return;
        }
        // Single file - add directly
        allFiles.push({
          ref_type: "file",
          drive_id: ref.drive_id,
          drive_name: ref.drive_name,
          drive_path: ref.drive_path || "",
          mime_type: ref.mime_type,
          display_order: displayOrder++,
        });
      } else if (ref.ref_type === "folder") {
        // Folder - expand recursively
        const folderFiles = await expandFolder(
          workspaceId,
          drive,
          ref.drive_id,
          ref.drive_name,
          ref.include_subfolders,
          0
        );

        for (const file of folderFiles) {
          file.display_order = displayOrder++;
          allFiles.push(file);
        }
      }
    })
  );

  // Deduplicate by drive_id
  const uniqueFiles = allFiles.filter(
    (file, index, self) =>
      index === self.findIndex((f) => f.drive_id === file.drive_id)
  );

  // Save to cache
  await supabase.rpc("update_team_expanded_files", {
    p_team_id: teamId,
    p_files: uniqueFiles,
    p_ttl_seconds: CACHE_TTL_SECONDS,
  });

  return uniqueFiles;
}

/**
 * Recursively expand folder contents
 */
async function expandFolder(
  workspaceId: string,
  drive: Awaited<ReturnType<typeof getDriveClientForWorkspace>>,
  folderId: string,
  folderPath: string,
  includeSubfolders: boolean,
  depth: number
): Promise<ExpandedFile[]> {
  if (depth > MAX_DEPTH || !drive) {
    return [];
  }

  try {
    // Use cached folder contents
    const contents = await getCachedFolderContents(
      { workspaceId, folderId },
      () => listFolderContents(drive, folderId)
    );

    const results: ExpandedFile[] = [];

    // Add folders (excluding hidden folders)
    for (const folder of contents.folders) {
      // Skip hidden folders (starting with .)
      if (folder.name?.startsWith(".")) {
        continue;
      }
      results.push({
        ref_type: "folder",
        drive_id: folder.id,
        drive_name: folder.name,
        drive_path: folderPath,
        mime_type: "application/vnd.google-apps.folder",
        display_order: 0,
      });
    }

    // Add files (excluding spreadsheets and hidden files)
    for (const file of contents.files) {
      // Skip hidden files (starting with .)
      if (file.name?.startsWith(".")) {
        continue;
      }
      // Skip excluded MIME types (spreadsheets)
      if (EXCLUDED_MIME_TYPES.has(file.mimeType)) {
        continue;
      }
      results.push({
        ref_type: "file",
        drive_id: file.id,
        drive_name: file.name,
        drive_path: folderPath,
        mime_type: file.mimeType,
        display_order: 0,
      });
    }

    // Recursively expand subfolders
    if (includeSubfolders && contents.folders.length > 0) {
      const subfolderResults = await Promise.all(
        contents.folders.map((folder) =>
          expandFolder(
            workspaceId,
            drive,
            folder.id,
            `${folderPath}/${folder.name}`,
            true,
            depth + 1
          )
        )
      );

      results.push(...subfolderResults.flat());
    }

    return results;
  } catch (error) {
    console.error(`Error expanding folder ${folderId}:`, error);
    return [];
  }
}
