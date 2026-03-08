import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDriveClientForWorkspace } from "@/lib/google-drive";

/**
 * GET /api/workspace/drive/files/[fileId]
 * Google Driveファイルのコンテンツを取得
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

    // Get file metadata first
    const metaResponse = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size, webViewLink, modifiedTime",
      supportsAllDrives: true,
    });

    const fileMeta = metaResponse.data;
    const mimeType = fileMeta.mimeType || "application/octet-stream";
    const fileName = fileMeta.name || "unknown";

    // Handle Google Workspace files (Docs, Sheets, Slides) - export as PDF
    if (mimeType.startsWith("application/vnd.google-apps.")) {
      // Google Docs → PDF
      if (mimeType === "application/vnd.google-apps.document") {
        const exportResponse = await drive.files.export(
          { fileId, mimeType: "application/pdf" },
          { responseType: "arraybuffer" }
        );

        return new NextResponse(exportResponse.data as ArrayBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}.pdf"`,
            "X-File-Name": encodeURIComponent(fileName),
            "X-Original-Mime-Type": mimeType,
          },
        });
      }

      // Google Sheets → PDF (for preview)
      if (mimeType === "application/vnd.google-apps.spreadsheet") {
        const exportResponse = await drive.files.export(
          { fileId, mimeType: "application/pdf" },
          { responseType: "arraybuffer" }
        );

        return new NextResponse(exportResponse.data as ArrayBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}.pdf"`,
            "X-File-Name": encodeURIComponent(fileName),
            "X-Original-Mime-Type": mimeType,
          },
        });
      }

      // Google Slides → PDF
      if (mimeType === "application/vnd.google-apps.presentation") {
        const exportResponse = await drive.files.export(
          { fileId, mimeType: "application/pdf" },
          { responseType: "arraybuffer" }
        );

        return new NextResponse(exportResponse.data as ArrayBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}.pdf"`,
            "X-File-Name": encodeURIComponent(fileName),
            "X-Original-Mime-Type": mimeType,
          },
        });
      }

      // Other Google Apps files - return metadata only
      return NextResponse.json({
        id: fileMeta.id,
        name: fileName,
        mimeType,
        size: fileMeta.size,
        webViewLink: fileMeta.webViewLink,
        modifiedTime: fileMeta.modifiedTime,
        previewable: false,
        message: "This file type can only be viewed in Google Drive",
      });
    }

    // Handle regular files - download content
    const fileResponse = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" }
    );

    return new NextResponse(fileResponse.data as ArrayBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        "X-File-Name": encodeURIComponent(fileName),
        "X-Original-Mime-Type": mimeType,
        ...(fileMeta.size && { "Content-Length": fileMeta.size }),
      },
    });
  } catch (error) {
    console.error("Error in GET /api/workspace/drive/files/[fileId]:", error);
    const err = error as { message?: string; code?: number };

    if (err.code === 404) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Failed to get file" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspace/drive/files/[fileId]
 * Google Driveファイルを削除
 *
 * Query params:
 * - workspaceId: ワークスペースID (必須)
 */
export async function DELETE(
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

    // Verify workspace membership with admin role
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Only allow admins and owners to delete files
    if (!["admin", "owner"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only admins can delete files" },
        { status: 403 }
      );
    }

    // Get Drive client
    const drive = await getDriveClientForWorkspace(workspaceId);
    if (!drive) {
      return NextResponse.json(
        { error: "Google Drive is not connected" },
        { status: 400 }
      );
    }

    // Get file metadata first to return info about deleted file
    const metaResponse = await drive.files.get({
      fileId,
      fields: "id, name, mimeType",
      supportsAllDrives: true,
    });

    const fileMeta = metaResponse.data;

    // Delete the file
    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });

    return NextResponse.json({
      success: true,
      deleted: {
        id: fileMeta.id,
        name: fileMeta.name,
        mimeType: fileMeta.mimeType,
      },
    });
  } catch (error) {
    console.error("Error in DELETE /api/workspace/drive/files/[fileId]:", error);
    const err = error as { message?: string; code?: number };

    if (err.code === 404) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    if (err.code === 403) {
      return NextResponse.json(
        { error: "Permission denied - cannot delete this file" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Failed to delete file" },
      { status: 500 }
    );
  }
}
