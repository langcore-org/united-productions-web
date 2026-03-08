"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { DriveFile, DriveFolder } from "@/lib/google-drive/types";

// L1 Memory Cache Configuration
const L1_TTL_MS = 60000; // 60 seconds for L1 memory cache (same page)

interface CacheEntry {
  data: FolderState;
  timestamp: number;
}

// Module-level L1 cache (shared across component instances within same page)
const l1Cache = new Map<string, CacheEntry>();

export interface FolderState {
  loaded: boolean;
  loading: boolean;
  files: DriveFile[];
  folders: DriveFolder[];
  expanded: boolean;
  error?: string;
  fromCache?: boolean;
  cachedAt?: string;
}

export interface FolderTreeState {
  [folderId: string]: FolderState;
}

interface UseFolderTreeOptions {
  workspaceId: string;
  rootFolderId: string | null;
  enablePrefetch?: boolean; // Default: true
}

export function useFolderTree({
  workspaceId,
  rootFolderId,
  enablePrefetch = true,
}: UseFolderTreeOptions) {
  const [state, setState] = useState<FolderTreeState>({});
  const [rootLoading, setRootLoading] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);

  // Track folders being pre-fetched to avoid duplicates
  const prefetchingRef = useRef<Set<string>>(new Set());

  // Generate cache key
  const getCacheKey = useCallback(
    (folderId: string) => `${workspaceId}:${folderId}`,
    [workspaceId]
  );

  // Check L1 cache
  const getFromL1Cache = useCallback(
    (folderId: string): FolderState | null => {
      const key = getCacheKey(folderId);
      const entry = l1Cache.get(key);

      if (entry && Date.now() - entry.timestamp < L1_TTL_MS) {
        return entry.data;
      }

      // Expired - remove from cache
      if (entry) {
        l1Cache.delete(key);
      }

      return null;
    },
    [getCacheKey]
  );

  // Update L1 cache
  const updateL1Cache = useCallback(
    (folderId: string, data: FolderState) => {
      const key = getCacheKey(folderId);
      l1Cache.set(key, { data, timestamp: Date.now() });
    },
    [getCacheKey]
  );

  // Load folder contents from API
  const loadFolder = useCallback(
    async (folderId: string, skipCache = false) => {
      if (!workspaceId) return;

      // Check L1 cache first (unless skipping cache)
      if (!skipCache) {
        const cached = getFromL1Cache(folderId);
        if (cached) {
          setState((prev) => ({
            ...prev,
            [folderId]: {
              ...cached,
              expanded: prev[folderId]?.expanded ?? cached.expanded,
            },
          }));
          return;
        }
      }

      setState((prev) => ({
        ...prev,
        [folderId]: {
          ...prev[folderId],
          loading: true,
          error: undefined,
        },
      }));

      try {
        const params = new URLSearchParams({
          workspaceId,
          folderId,
          prefetch: enablePrefetch ? "true" : "false",
        });

        if (skipCache) {
          params.set("refresh", "true");
        }

        const response = await fetch(
          `/api/workspace/drive/folders?${params}`
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load folder");
        }

        const data = await response.json();
        const cacheHeader = response.headers.get("X-Cache");
        const cachedAtHeader = response.headers.get("X-Cached-At");

        const folderState: FolderState = {
          loaded: true,
          loading: false,
          files: data.files || [],
          folders: data.folders || [],
          expanded: true,
          fromCache: cacheHeader === "HIT" || data.fromCache,
          cachedAt: cachedAtHeader || data.cachedAt,
        };

        // Update both React state and L1 cache
        setState((prev) => ({
          ...prev,
          [folderId]: {
            ...folderState,
            expanded: prev[folderId]?.expanded ?? true,
          },
        }));
        updateL1Cache(folderId, folderState);
      } catch (error) {
        const err = error as Error;
        setState((prev) => ({
          ...prev,
          [folderId]: {
            ...prev[folderId],
            loaded: false,
            loading: false,
            error: err.message,
            files: [],
            folders: [],
          },
        }));
      }
    },
    [workspaceId, enablePrefetch, getFromL1Cache, updateL1Cache]
  );

  // Pre-fetch folder on hover (optimistic loading)
  const prefetchFolder = useCallback(
    (folderId: string) => {
      if (!enablePrefetch || !workspaceId) return;

      // Skip if already loaded, loading, or prefetching
      const current = state[folderId];
      if (current?.loaded || current?.loading) return;
      if (prefetchingRef.current.has(folderId)) return;

      // Check L1 cache
      if (getFromL1Cache(folderId)) return;

      // Mark as prefetching
      prefetchingRef.current.add(folderId);

      // Fetch in background (don't update loading state for prefetch)
      fetch(
        `/api/workspace/drive/folders?workspaceId=${workspaceId}&folderId=${folderId}&prefetch=true`
      )
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            const folderState: FolderState = {
              loaded: true,
              loading: false,
              files: data.files || [],
              folders: data.folders || [],
              expanded: false, // Don't auto-expand prefetched folders
              fromCache: data.fromCache,
              cachedAt: data.cachedAt,
            };
            updateL1Cache(folderId, folderState);
          }
        })
        .catch(() => {
          // Silently ignore prefetch errors
        })
        .finally(() => {
          prefetchingRef.current.delete(folderId);
        });
    },
    [workspaceId, enablePrefetch, state, getFromL1Cache, updateL1Cache]
  );

  // Toggle folder expansion
  const toggleFolder = useCallback(
    (folderId: string) => {
      setState((prev) => {
        const folder = prev[folderId];
        const isExpanding = !folder?.expanded;

        // If expanding and not loaded, load the folder
        if (isExpanding && !folder?.loaded && !folder?.loading) {
          // Check L1 cache first
          const cached = getFromL1Cache(folderId);
          if (cached) {
            return {
              ...prev,
              [folderId]: {
                ...cached,
                expanded: true,
              },
            };
          }
          // No cache - trigger load
          loadFolder(folderId);
        }

        return {
          ...prev,
          [folderId]: {
            ...folder,
            expanded: isExpanding,
            loaded: folder?.loaded ?? false,
            loading: folder?.loading ?? false,
            files: folder?.files ?? [],
            folders: folder?.folders ?? [],
          },
        };
      });
    },
    [loadFolder, getFromL1Cache]
  );

  // Force reload folder (bypass all caches)
  const reloadFolder = useCallback(
    async (folderId: string) => {
      // Clear L1 cache for this folder
      l1Cache.delete(getCacheKey(folderId));

      setState((prev) => ({
        ...prev,
        [folderId]: {
          ...prev[folderId],
          loaded: false,
        },
      }));

      await loadFolder(folderId, true); // Skip cache
    },
    [loadFolder, getCacheKey]
  );

  // Load root folder on mount
  useEffect(() => {
    if (!rootFolderId || !workspaceId) return;

    const loadRoot = async () => {
      setRootLoading(true);
      setRootError(null);

      try {
        await loadFolder(rootFolderId);
        setState((prev) => ({
          ...prev,
          [rootFolderId]: {
            ...prev[rootFolderId],
            expanded: true,
          },
        }));
      } catch (error) {
        const err = error as Error;
        setRootError(err.message);
      } finally {
        setRootLoading(false);
      }
    };

    loadRoot();
  }, [rootFolderId, workspaceId, loadFolder]);

  // Delete a file and refresh parent folder
  const deleteFile = useCallback(
    async (fileId: string, parentFolderId: string): Promise<boolean> => {
      if (!workspaceId) return false;

      try {
        const response = await fetch(
          `/api/workspace/drive/files/${fileId}?workspaceId=${workspaceId}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to delete file");
        }

        // Clear cache and reload parent folder
        l1Cache.delete(getCacheKey(parentFolderId));
        await loadFolder(parentFolderId, true);

        return true;
      } catch (error) {
        console.error("Delete file error:", error);
        throw error;
      }
    },
    [workspaceId, getCacheKey, loadFolder]
  );

  return {
    state,
    rootLoading,
    rootError,
    loadFolder,
    toggleFolder,
    reloadFolder,
    prefetchFolder, // For hover pre-fetch
    deleteFile, // For file deletion
  };
}
