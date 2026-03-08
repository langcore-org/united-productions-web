import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadFileToWorkspace, type UploadedFile } from "@/lib/google-drive/client";

/**
 * POST /api/workspace/drive/upload
 * Google Driveにファイルをアップロード
 *
 * Request body:
 * - workspaceId: ワークスペースID (必須)
 * - folderId: アップロード先フォルダID (必須)
 * - fileName: ファイル名 (必須)
 * - content: ファイル内容 (base64エンコード) (必須)
 * - mimeType: MIMEタイプ (必須)
 *
 * Response:
 * - id: Google DriveファイルID
 * - name: ファイル名
 * - mimeType: MIMEタイプ
 * - webViewLink: ファイルへのリンク
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, folderId, fileName, content, mimeType } = body;

    // Validate required fields
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
    if (!content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }
    if (!mimeType) {
      return NextResponse.json(
        { error: "mimeType is required" },
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

    // Decode base64 content
    let contentBuffer: Buffer;
    try {
      contentBuffer = Buffer.from(content, "base64");
    } catch {
      return NextResponse.json(
        { error: "Invalid base64 content" },
        { status: 400 }
      );
    }

    // Check file size limit (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (contentBuffer.length > maxSize) {
      return NextResponse.json(
        { error: `File too large: ${contentBuffer.length} bytes (max ${maxSize} bytes)` },
        { status: 413 }
      );
    }

    // Upload to Google Drive
    const uploadedFile: UploadedFile | null = await uploadFileToWorkspace(
      workspaceId,
      folderId,
      fileName,
      contentBuffer,
      mimeType
    );

    if (!uploadedFile) {
      return NextResponse.json(
        { error: "Google Drive is not connected or upload failed" },
        { status: 400 }
      );
    }

    console.log(`File uploaded to Google Drive: ${uploadedFile.id} (${fileName})`);

    return NextResponse.json({
      success: true,
      file: uploadedFile,
    });
  } catch (error) {
    console.error("Error in POST /api/workspace/drive/upload:", error);
    const err = error as { message?: string };

    // Check for specific Google Drive errors
    const errorMessage = err.message || "Failed to upload file";

    if (errorMessage.includes("notFound")) {
      return NextResponse.json(
        { error: "Upload folder not found or not accessible" },
        { status: 404 }
      );
    }

    if (errorMessage.includes("forbidden") || errorMessage.includes("insufficientPermissions")) {
      return NextResponse.json(
        { error: "Insufficient permissions to upload to this folder" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
