import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDriveClientForWorkspace } from "@/lib/google-drive";
import mammoth from "mammoth";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

const MAX_CONTENT_LENGTH = 50000; // 50KB limit

/**
 * POST /api/chat/extract-content
 * Google Driveファイルからテキスト内容を抽出
 *
 * Request body:
 * - fileId: Google Drive file ID
 * - mimeType: File MIME type
 * - workspaceId: Workspace ID
 */
export async function POST(request: NextRequest) {
  try {
    const { fileId, mimeType, workspaceId } = await request.json();

    if (!fileId || !mimeType || !workspaceId) {
      return NextResponse.json(
        { error: "fileId, mimeType, and workspaceId are required" },
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

    let content: string = "";

    // Handle based on MIME type
    switch (mimeType) {
      // Google Docs → export as plain text
      case "application/vnd.google-apps.document": {
        const exportResponse = await drive.files.export({
          fileId,
          mimeType: "text/plain",
        });
        content = exportResponse.data as string;
        break;
      }

      // Google Sheets → export as CSV
      case "application/vnd.google-apps.spreadsheet": {
        const exportResponse = await drive.files.export({
          fileId,
          mimeType: "text/csv",
        });
        content = exportResponse.data as string;
        break;
      }

      // Word documents (.docx)
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        const fileResponse = await drive.files.get(
          { fileId, alt: "media", supportsAllDrives: true },
          { responseType: "arraybuffer" }
        );
        const buffer = Buffer.from(fileResponse.data as ArrayBuffer);
        const result = await mammoth.extractRawText({ buffer });
        content = result.value;
        break;
      }

      // PDF files
      case "application/pdf": {
        const fileResponse = await drive.files.get(
          { fileId, alt: "media", supportsAllDrives: true },
          { responseType: "arraybuffer" }
        );
        const buffer = Buffer.from(fileResponse.data as ArrayBuffer);
        const pdfData = await pdfParse(buffer);
        content = pdfData.text;
        break;
      }

      // Plain text files
      case "text/plain":
      case "text/markdown":
      case "text/csv":
      case "application/json":
      case "text/html":
      case "text/xml":
      case "application/xml": {
        const fileResponse = await drive.files.get(
          { fileId, alt: "media", supportsAllDrives: true },
          { responseType: "arraybuffer" }
        );
        const buffer = Buffer.from(fileResponse.data as ArrayBuffer);
        content = buffer.toString("utf-8");
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unsupported file type: ${mimeType}` },
          { status: 400 }
        );
    }

    // Apply length limit
    const truncated = content.length > MAX_CONTENT_LENGTH;
    const finalContent = content.slice(0, MAX_CONTENT_LENGTH);

    return NextResponse.json({
      content: finalContent,
      truncated,
      originalLength: content.length,
    });
  } catch (error) {
    console.error("Error in POST /api/chat/extract-content:", error);
    const err = error as { message?: string; code?: number };

    if (err.code === 404) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: err.message || "Failed to extract content" },
      { status: 500 }
    );
  }
}
