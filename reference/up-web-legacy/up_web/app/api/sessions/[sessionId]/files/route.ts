import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GeneratedFile {
  id: string;
  path: string;
  name: string;
  mimeType?: string;
  uploadStatus?: "pending" | "uploading" | "completed" | "error";
  driveId?: string;
  driveUrl?: string;
  createdAt: string;
}

/**
 * GET /api/sessions/[sessionId]/files
 * Get all generated files for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get files for session
    const { data: files, error } = await supabase
      .from("session_generated_files")
      .select("id, file_path, file_name, file_type, drive_id, drive_url, upload_status, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[sessions/files] Error fetching files:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to frontend format
    const formattedFiles: GeneratedFile[] = (files || []).map((file) => ({
      id: file.id,
      path: file.file_path,
      name: file.file_name || file.file_path.split("/").pop() || file.file_path,
      mimeType: file.file_type || undefined,
      uploadStatus: file.upload_status || "pending",
      driveId: file.drive_id || undefined,
      driveUrl: file.drive_url || undefined,
      createdAt: file.created_at,
    }));

    return NextResponse.json({ files: formattedFiles });
  } catch (error) {
    console.error("[sessions/files] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sessions/[sessionId]/files
 * Add a generated file to the session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const file: GeneratedFile = body.file;

    if (!file || !file.path) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }

    // Extract file extension
    const fileName = file.name || file.path.split("/").pop() || file.path;
    const fileType = fileName.includes(".") ? fileName.split(".").pop() : null;

    // Upsert file (update if exists, insert if not)
    const { data, error } = await supabase
      .from("session_generated_files")
      .upsert(
        {
          session_id: sessionId,
          file_path: file.path,
          file_name: fileName,
          file_type: fileType,
          drive_id: file.driveId || null,
          drive_url: file.driveUrl || null,
          upload_status: file.uploadStatus || "pending",
        },
        {
          onConflict: "session_id,file_path",
        }
      )
      .select("id")
      .single();

    if (error) {
      console.error("[sessions/files] Error upserting file:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error("[sessions/files] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sessions/[sessionId]/files
 * Update a generated file (e.g., after upload to Drive)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileId, driveId, driveUrl, uploadStatus } = body;

    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (driveId !== undefined) updateData.drive_id = driveId;
    if (driveUrl !== undefined) updateData.drive_url = driveUrl;
    if (uploadStatus !== undefined) updateData.upload_status = uploadStatus;

    const { error } = await supabase
      .from("session_generated_files")
      .update(updateData)
      .eq("id", fileId)
      .eq("session_id", sessionId);

    if (error) {
      console.error("[sessions/files] Error updating file:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[sessions/files] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
