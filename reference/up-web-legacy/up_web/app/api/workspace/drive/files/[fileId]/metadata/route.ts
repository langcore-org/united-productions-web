import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDriveClientForWorkspace } from "@/lib/google-drive";

/**
 * GET /api/workspace/drive/files/[fileId]/metadata
 * Google Driveファイルのメタデータのみを取得
 *
 * Query params:
 * - workspaceId: ワークスペースID (必須)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
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

    // Get Drive client
    const drive = await getDriveClientForWorkspace(workspaceId);
    if (!drive) {
      return NextResponse.json(
        { error: "Google Drive is not connected" },
        { status: 400 }
      );
    }

    // Get file metadata
    const response = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size, webViewLink, iconLink, modifiedTime, createdTime",
      supportsAllDrives: true,
    });

    const fileMeta = response.data;
    const mimeType = fileMeta.mimeType || "application/octet-stream";

    // Determine if file is previewable
    const previewable = isPreviewable(mimeType);

    return NextResponse.json({
      id: fileMeta.id,
      name: fileMeta.name,
      mimeType,
      size: fileMeta.size ? parseInt(fileMeta.size, 10) : undefined,
      webViewLink: fileMeta.webViewLink,
      iconLink: fileMeta.iconLink,
      modifiedTime: fileMeta.modifiedTime,
      createdTime: fileMeta.createdTime,
      previewable,
      previewType: getPreviewType(mimeType),
    });
  } catch (error) {
    console.error("Error in GET /api/workspace/drive/files/[fileId]/metadata:", error);
    const err = error as { message?: string; code?: number };

    if (err.code === 404) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Failed to get file metadata" },
      { status: 500 }
    );
  }
}

/**
 * Check if a file type is previewable
 */
function isPreviewable(mimeType: string): boolean {
  // Images
  if (mimeType.startsWith("image/")) {
    return true;
  }

  // PDF
  if (mimeType === "application/pdf") {
    return true;
  }

  // Text files (but not binary-looking text types)
  if (mimeType.startsWith("text/") && !mimeType.includes("rtf")) {
    return true;
  }

  // Code files
  if (
    mimeType === "application/javascript" ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "text/javascript" ||
    mimeType === "text/json" ||
    mimeType === "text/xml" ||
    mimeType === "text/html" ||
    mimeType === "text/css"
  ) {
    return true;
  }

  // Google Workspace files (will be exported as PDF)
  if (
    mimeType === "application/vnd.google-apps.document" ||
    mimeType === "application/vnd.google-apps.spreadsheet" ||
    mimeType === "application/vnd.google-apps.presentation"
  ) {
    return true;
  }

  // MS Office documents - use Google Drive Viewer (iframe embed)
  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return true;
  }

  return false;
}

/**
 * Get the preview type for a mime type
 */
function getPreviewType(mimeType: string): "image" | "pdf" | "text" | "office" | "unsupported" {
  // Images
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  // PDF
  if (mimeType === "application/pdf") {
    return "pdf";
  }

  // Google Workspace files (will be exported as PDF)
  if (
    mimeType === "application/vnd.google-apps.document" ||
    mimeType === "application/vnd.google-apps.spreadsheet" ||
    mimeType === "application/vnd.google-apps.presentation"
  ) {
    return "pdf";
  }

  // MS Office documents - use Google Drive embed viewer
  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "office";
  }

  // Text files (but not RTF which is binary-ish)
  if (mimeType.startsWith("text/") && !mimeType.includes("rtf")) {
    return "text";
  }

  // Code files
  if (
    mimeType === "application/javascript" ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "text/javascript" ||
    mimeType === "text/json" ||
    mimeType === "text/xml" ||
    mimeType === "text/html" ||
    mimeType === "text/css"
  ) {
    return "text";
  }

  return "unsupported";
}
