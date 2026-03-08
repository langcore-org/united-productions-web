import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDriveClientForWorkspace } from "@/lib/google-drive";
import { enhancePrompt } from "@/lib/prompt_enhance";
import type { EnhancePromptRequest, EnhancePromptResponse } from "@/lib/prompt_enhance";

const MAX_FILE_CONTENT_LENGTH = 10000; // 10KB per file for context

/**
 * Extract text content from a file (text-based files only for prompt enhancement)
 */
async function extractFileContent(
  drive: Awaited<ReturnType<typeof getDriveClientForWorkspace>>,
  fileId: string,
  mimeType: string
): Promise<string> {
  if (!drive) return "";

  try {
    let content = "";

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

      // PDF and Word files - skip for prompt enhancement (complex parsing)
      case "application/pdf":
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      default:
        // Unsupported type, return file name as context hint
        return "";
    }

    // Truncate to limit
    return content.slice(0, MAX_FILE_CONTENT_LENGTH);
  } catch (error) {
    console.error(`Failed to extract content from file ${fileId}:`, error);
    return "";
  }
}

/**
 * POST /api/chat/enhance-prompt
 * Enhance a prompt using Gemini 2.0 Flash
 */
export async function POST(request: NextRequest) {
  try {
    const body: EnhancePromptRequest = await request.json();
    const { text, files, workspaceId } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

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

    // Extract file contents for context (if any)
    let fileContext = "";
    if (files && files.length > 0) {
      const drive = await getDriveClientForWorkspace(workspaceId);
      if (drive) {
        const fileContents: string[] = [];
        for (const file of files) {
          const content = await extractFileContent(drive, file.id, file.mimeType);
          if (content) {
            fileContents.push(`--- ${file.name} ---\n${content}`);
          }
        }
        if (fileContents.length > 0) {
          fileContext = fileContents.join("\n\n");
        }
      }
    }

    // Enhance the prompt using Gemini
    const enhancedText = await enhancePrompt(text, fileContext || undefined);

    const response: EnhancePromptResponse = {
      enhancedPrompt: enhancedText,
      originalLength: text.length,
      enhancedLength: enhancedText.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in POST /api/chat/enhance-prompt:", error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to enhance prompt" },
      { status: 500 }
    );
  }
}
