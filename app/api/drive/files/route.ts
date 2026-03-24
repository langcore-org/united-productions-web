/**
 * Google Drive Files API Route
 *
 * GET /api/drive/files - ファイル一覧取得
 * POST /api/drive/files - ファイルアップロード
 */

import { type NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/utils";
import { createClient } from "@/lib/supabase/server";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

const ALLOWED_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const DANGEROUS_EXTENSIONS = [
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".sh",
  ".php",
  ".jsp",
  ".asp",
  ".aspx",
  ".py",
  ".rb",
  ".pl",
];

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\\/]/g, "_")
    .replace(/\.\./g, "_")
    .replace(/[^\w\-.]/g, "_")
    .substring(0, 255);
}

function sanitizeDriveQuery(query: string): string {
  return (
    query
      // biome-ignore lint/suspicious/noControlCharactersInRegex: character class range
      .replace(/[\x00-\x1F\x7F]/g, "")
      .replace(/[<>]/g, "")
      .substring(0, 100)
  );
}

function validateFile(file: File, allowedName?: string): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `ファイルサイズが大きすぎます（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `許可されていないファイルタイプです: ${file.type}`,
    };
  }

  const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: "危険なファイル形式はアップロードできません",
    };
  }

  const sanitizedName = sanitizeFilename(allowedName || file.name);
  if (sanitizedName.length === 0) {
    return {
      valid: false,
      error: "無効なファイル名です",
    };
  }

  return { valid: true };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.provider_token) {
      return errorResponse("認証が必要です", 401);
    }

    const accessToken = session.provider_token;
    const { searchParams } = new URL(request.url);
    const pageSize = Math.min(Number.parseInt(searchParams.get("pageSize") || "20", 10), 100);
    const rawQuery = searchParams.get("q") || "";

    const query = sanitizeDriveQuery(rawQuery);

    if (Number.isNaN(pageSize) || pageSize < 1) {
      return errorResponse("無効なpageSizeです", 400);
    }

    let q = "trashed=false";
    if (query) {
      const safeQuery = query.replace(/'/g, "\\'");
      q += ` and name contains '${safeQuery}'`;
    }

    const response = await fetch(
      `${DRIVE_API_BASE}/files?pageSize=${pageSize}&q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Drive API error:", error);
      return errorResponse("Drive APIエラー", response.status);
    }

    const data = await response.json();
    return NextResponse.json({ files: data.files || [] });
  } catch (error) {
    console.error("Drive files error:", error);
    return errorResponse("サーバーエラー", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.provider_token) {
      return errorResponse("認証が必要です", 401);
    }

    const accessToken = session.provider_token;
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;

    if (!file) {
      return errorResponse("ファイルが必要です", 400);
    }

    const validation = validateFile(file, name);
    if (!validation.valid) {
      return errorResponse(validation.error || "バリデーションエラー", 400);
    }

    const sanitizedName = sanitizeFilename(name || file.name);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const metadata = {
      name: sanitizedName,
      mimeType: file.type || "application/octet-stream",
    };

    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const body =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: " +
      metadata.mimeType +
      "\r\n\r\n" +
      buffer.toString("binary") +
      close_delim;

    const response = await fetch(`${DRIVE_API_BASE}/files?uploadType=multipart`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: body,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Drive upload error:", error);
      return errorResponse("アップロードに失敗しました", response.status);
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      file: {
        id: data.id,
        name: data.name,
        webViewLink: data.webViewLink,
      },
    });
  } catch (error) {
    console.error("Drive upload error:", error);
    return errorResponse("サーバーエラー", 500);
  }
}
