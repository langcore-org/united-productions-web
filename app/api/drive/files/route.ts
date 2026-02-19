/**
 * Google Drive Files API Route
 * 
 * GET /api/drive/files - ファイル一覧取得
 * POST /api/drive/files - ファイルアップロード
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

// 許可するファイルタイプ
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

// 最大ファイルサイズ（10MB）
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 危険な拡張子のブラックリスト
const DANGEROUS_EXTENSIONS = [
  ".exe", ".dll", ".bat", ".cmd", ".sh", ".php", 
  ".jsp", ".asp", ".aspx", ".py", ".rb", ".pl"
];

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * ファイル名をサニタイズ
 */
function sanitizeFilename(filename: string): string {
  // パストラバーサル対策
  return filename
    .replace(/[\\/]/g, "_")      // パス区切り文字を除去
    .replace(/\.\./g, "_")       // 親ディレクトリ参照を除去
    .replace(/[^\w\-\.]/g, "_")  // 英数字・ハイフン・ドット以外を除去
    .substring(0, 255);          // 長さ制限
}

/**
 * Drive APIクエリ文字列をサニタイズ
 */
function sanitizeDriveQuery(query: string): string {
  // 制御文字を除去
  return query
    .replace(/[\x00-\x1F\x7F]/g, "")  // 制御文字
    .replace(/[<>]/g, "")              // HTMLタグ
    .substring(0, 100);                // 長さ制限
}

/**
 * ファイルを検証
 */
function validateFile(file: File, allowedName?: string): FileValidationResult {
  // ファイルサイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `ファイルサイズが大きすぎます（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）`,
    };
  }

  // MIMEタイプチェック
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `許可されていないファイルタイプです: ${file.type}`,
    };
  }

  // 拡張子チェック
  const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: "危険なファイル形式はアップロードできません",
    };
  }

  // ファイル名の長さチェック
  const sanitizedName = sanitizeFilename(allowedName || file.name);
  if (sanitizedName.length === 0) {
    return {
      valid: false,
      error: "無効なファイル名です",
    };
  }

  return { valid: true };
}

/**
 * Google Driveのファイル一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    const typedSession = session as Session | null;
    if (!typedSession?.accessToken) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "20", 10),
      100 // 最大100件に制限
    );
    const rawQuery = searchParams.get("q") || "";

    // クエリパラメータのバリデーションとサニタイズ
    const query = sanitizeDriveQuery(rawQuery);
    
    // pageSizeのバリデーション
    if (isNaN(pageSize) || pageSize < 1) {
      return NextResponse.json(
        { error: "無効なpageSizeです" },
        { status: 400 }
      );
    }

    // Drive APIクエリ構築
    let q = "trashed=false";
    if (query) {
      // シングルクォートをエスケープしてインジェクション防止
      const safeQuery = query.replace(/'/g, "\\'");
      q += ` and name contains '${safeQuery}'`;
    }

    const response = await fetch(
      `${DRIVE_API_BASE}/files?pageSize=${pageSize}&q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)`,
      {
        headers: {
          Authorization: `Bearer ${typedSession.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Drive API error:", error);
      return NextResponse.json(
        { error: "Drive APIエラー" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ files: data.files || [] });

  } catch (error) {
    console.error("Drive files error:", error);
    return NextResponse.json(
      { error: "サーバーエラー" },
      { status: 500 }
    );
  }
}

/**
 * Google Driveにファイルをアップロード
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    const typedSession = session as Session | null;
    if (!typedSession?.accessToken) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが必要です" },
        { status: 400 }
      );
    }

    // ファイル検証
    const validation = validateFile(file, name);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // サニタイズされたファイル名
    const sanitizedName = sanitizeFilename(name || file.name);

    // ファイル内容をArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // メタデータ
    const metadata = {
      name: sanitizedName,
      mimeType: file.type || "application/octet-stream",
    };

    // multipart upload
    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const body =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: " + metadata.mimeType + "\r\n\r\n" +
      buffer.toString("binary") +
      close_delim;

    const response = await fetch(
      `${DRIVE_API_BASE}/files?uploadType=multipart`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${typedSession.accessToken}`,
          "Content-Type": "multipart/related; boundary=" + boundary,
        },
        body: body,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Drive upload error:", error);
      return NextResponse.json(
        { error: "アップロードに失敗しました" },
        { status: response.status }
      );
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
    return NextResponse.json(
      { error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
