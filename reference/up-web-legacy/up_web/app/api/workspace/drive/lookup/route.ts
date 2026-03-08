import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findFileByNameInWorkspace } from "@/lib/google-drive/client";

/**
 * GET /api/workspace/drive/lookup?workspaceId=xxx&folderId=xxx&fileName=xxx
 * Lookup a file by name in a specific folder
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const folderId = searchParams.get("folderId");
    const fileName = searchParams.get("fileName");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    if (!folderId) {
      return NextResponse.json(
        { error: "folderId is required" },
        { status: 400 }
      );
    }

    if (!fileName) {
      return NextResponse.json(
        { error: "fileName is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 403 }
      );
    }

    // Find the file
    const file = await findFileByNameInWorkspace(workspaceId, folderId, fileName);

    if (!file) {
      return NextResponse.json(
        { error: "File not found", found: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      found: true,
      file: {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        modifiedTime: file.modifiedTime,
        size: file.size,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/workspace/drive/lookup:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
