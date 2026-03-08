import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCacheStats, invalidateFolderCache } from "@/lib/google-drive";

interface CacheStats {
  totalCached: number;
  expiredCount: number;
  lastUpdated: string | null;
}

/**
 * GET /api/workspace/drive/cache
 * Get cache statistics for a workspace
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

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

    // Get cache stats
    const stats = await getCacheStats(workspaceId);

    // Get last updated timestamp
    const { data: lastCache } = await supabase
      .from("drive_folder_cache")
      .select("updated_at")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    const response: CacheStats = {
      ...stats,
      lastUpdated: lastCache?.updated_at || null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in GET /api/workspace/drive/cache:", error);
    return NextResponse.json(
      { error: "Failed to get cache stats" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspace/drive/cache
 * Invalidate/refresh cache for a workspace
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, folderId } = body;

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

    // Verify workspace membership (owner or admin)
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Invalidate cache
    const invalidatedCount = await invalidateFolderCache(workspaceId, folderId);

    // Get updated stats
    const stats = await getCacheStats(workspaceId);

    return NextResponse.json({
      success: true,
      invalidatedCount,
      stats,
    });
  } catch (error) {
    console.error("Error in POST /api/workspace/drive/cache:", error);
    return NextResponse.json(
      { error: "Failed to refresh cache" },
      { status: 500 }
    );
  }
}
