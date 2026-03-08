/**
 * Google Drive Folder Cache Service
 * 2-layer caching with Supabase L2 and pre-fetch support
 * Falls back gracefully to direct fetch if cache fails
 */

import { createClient } from "@/lib/supabase/server";
import type { DriveFile, DriveFolder, FolderContents } from "./types";

// Configuration
const DEFAULT_TTL_SECONDS = 300; // 5 minutes - matches team_expanded_files TTL
const PREFETCH_DEPTH = 2; // Pre-fetch up to 2 levels deep
const MAX_CONCURRENT_PREFETCH = 5;

export interface CachedFolderContents extends FolderContents {
  fromCache: boolean;
  cachedAt: string | null;
}

export interface FolderCacheOptions {
  workspaceId: string;
  folderId: string;
  ttlSeconds?: number;
  skipCache?: boolean;
}

interface CacheResult {
  cache_hit: boolean;
  is_locked: boolean;
  children_json: {
    folders: DriveFolder[];
    files: DriveFile[];
    folderInfo?: DriveFile | null;
    path?: string | null;
  } | null;
  cached_at: string | null;
}

/**
 * Get folder contents from cache or fetch from Drive
 * Implements stale-while-revalidate pattern
 * Falls back to direct fetch if cache fails
 */
export async function getCachedFolderContents(
  options: FolderCacheOptions,
  fetchFn: () => Promise<FolderContents>
): Promise<CachedFolderContents> {
  const {
    workspaceId,
    folderId,
    ttlSeconds = DEFAULT_TTL_SECONDS,
    skipCache = false,
  } = options;

  // Skip cache if requested (e.g., manual refresh) - just fetch directly
  if (skipCache) {
    const contents = await fetchFn();
    // Try to update cache in background but don't fail if it doesn't work
    tryUpdateCache(workspaceId, folderId, contents, ttlSeconds);
    return {
      ...contents,
      fromCache: false,
      cachedAt: new Date().toISOString(),
    };
  }

  // Try to use cache, fall back to direct fetch if anything fails
  try {
    const supabase = await createClient();

    // Try to get from cache with locking
    const { data: cacheResult, error } = await supabase.rpc(
      "get_or_lock_folder_cache",
      {
        p_workspace_id: workspaceId,
        p_folder_id: folderId,
        p_ttl_seconds: ttlSeconds,
      }
    );

    if (error) {
      console.debug("Cache lookup failed, fetching directly:", error.message);
      const contents = await fetchFn();
      return { ...contents, fromCache: false, cachedAt: null };
    }

    const result = (cacheResult as CacheResult[])?.[0];

    // Cache hit with valid data
    if (result?.cache_hit && result?.children_json) {
      const cached = result.children_json;
      return {
        folders: cached.folders || [],
        files: cached.files || [],
        folderInfo: cached.folderInfo,
        path: cached.path,
        fromCache: true,
        cachedAt: result.cached_at,
      };
    }

    // Cache miss or expired - fetch from Drive
    const contents = await fetchFn();

    // Update cache (await to ensure lock is released)
    try {
      await updateFolderCacheInternal(
        supabase,
        workspaceId,
        folderId,
        contents,
        ttlSeconds
      );
    } catch (e) {
      console.debug("Cache update failed, releasing lock:", e);
      // Release lock on error
      try {
        await supabase.rpc("update_folder_cache", {
          p_workspace_id: workspaceId,
          p_folder_id: folderId,
          p_children_json: { folders: [], files: [] },
          p_ttl_seconds: 1, // Expire immediately
        });
      } catch {
        // Ignore errors during cleanup
      }
    }

    return {
      ...contents,
      fromCache: false,
      cachedAt: new Date().toISOString(),
    };
  } catch (cacheError) {
    // If cache system fails entirely, just fetch directly
    console.debug("Cache system error, fetching directly:", cacheError);
    const contents = await fetchFn();
    return { ...contents, fromCache: false, cachedAt: null };
  }
}

/**
 * Try to update cache in background (fire-and-forget)
 */
async function tryUpdateCache(
  workspaceId: string,
  folderId: string,
  contents: FolderContents,
  ttlSeconds: number
): Promise<void> {
  try {
    const supabase = await createClient();
    await updateFolderCacheInternal(supabase, workspaceId, folderId, contents, ttlSeconds);
  } catch (e) {
    console.debug("Background cache update failed:", e);
  }
}

/**
 * Update folder cache (internal helper)
 */
async function updateFolderCacheInternal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  folderId: string,
  contents: FolderContents,
  ttlSeconds: number
): Promise<void> {
  await supabase.rpc("update_folder_cache", {
    p_workspace_id: workspaceId,
    p_folder_id: folderId,
    p_children_json: {
      folders: contents.folders,
      files: contents.files,
      folderInfo: contents.folderInfo,
      path: contents.path,
    },
    p_ttl_seconds: ttlSeconds,
  });
}

/**
 * Invalidate folder cache
 * @param workspaceId - Workspace ID
 * @param folderId - Optional folder ID (if null, invalidates entire workspace)
 */
export async function invalidateFolderCache(
  workspaceId: string,
  folderId?: string
): Promise<number> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("invalidate_folder_cache", {
      p_workspace_id: workspaceId,
      p_folder_id: folderId || null,
    });

    if (error) {
      console.debug("Failed to invalidate folder cache:", error.message);
      return 0;
    }

    return data as number;
  } catch (e) {
    console.debug("Cache invalidation error:", e);
    return 0;
  }
}

/**
 * Pre-fetch child folders in background
 * Fire-and-forget pattern - does not block main request
 */
export async function prefetchChildFolders(
  workspaceId: string,
  parentFolderId: string,
  folders: DriveFolder[],
  fetchFn: (folderId: string) => Promise<FolderContents>,
  depth: number = 1
): Promise<void> {
  if (depth > PREFETCH_DEPTH || folders.length === 0) {
    return;
  }

  try {
    const supabase = await createClient();

    // Check which folders are not cached
    const folderIds = folders.map((f) => f.id);
    const { data: cached } = await supabase
      .from("drive_folder_cache")
      .select("folder_id")
      .eq("workspace_id", workspaceId)
      .in("folder_id", folderIds)
      .gt("expires_at", new Date().toISOString());

    const cachedIds = new Set((cached || []).map((c) => c.folder_id));
    const uncachedFolders = folders.filter((f) => !cachedIds.has(f.id));

    if (uncachedFolders.length === 0) {
      return;
    }

    // Limit concurrent pre-fetches
    const foldersToFetch = uncachedFolders.slice(0, MAX_CONCURRENT_PREFETCH);

    // Pre-fetch in parallel
    await Promise.allSettled(
      foldersToFetch.map(async (folder) => {
        try {
          const contents = await getCachedFolderContents(
            { workspaceId, folderId: folder.id },
            () => fetchFn(folder.id)
          );

          // Recursively pre-fetch next level
          if (contents.folders.length > 0 && depth < PREFETCH_DEPTH) {
            await prefetchChildFolders(
              workspaceId,
              folder.id,
              contents.folders,
              fetchFn,
              depth + 1
            );
          }
        } catch (error) {
          // Silently ignore prefetch errors
          console.debug(`Prefetch failed for folder ${folder.id}:`, error);
        }
      })
    );
  } catch (e) {
    // Silently ignore prefetch errors
    console.debug("Prefetch system error:", e);
  }
}

/**
 * Check if folder is cached and valid
 */
export async function isFolderCached(
  workspaceId: string,
  folderId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("drive_folder_cache")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("folder_id", folderId)
      .gt("expires_at", new Date().toISOString())
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Get cache statistics for a workspace
 */
export async function getCacheStats(
  workspaceId: string
): Promise<{ totalCached: number; expiredCount: number }> {
  try {
    const supabase = await createClient();

    const [totalResult, expiredResult] = await Promise.all([
      supabase
        .from("drive_folder_cache")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      supabase
        .from("drive_folder_cache")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .lt("expires_at", new Date().toISOString()),
    ]);

    return {
      totalCached: totalResult.count || 0,
      expiredCount: expiredResult.count || 0,
    };
  } catch {
    return { totalCached: 0, expiredCount: 0 };
  }
}
