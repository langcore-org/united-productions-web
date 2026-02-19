/**
 * Google Drive Files API Route
 * 
 * GET /api/drive/files - ファイル一覧取得
 * POST /api/drive/files - ファイルアップロード
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

/**
 * Google Driveのファイル一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pageSize = searchParams.get("pageSize") || "20";
    const query = searchParams.get("q") || "";

    // Drive APIクエリ構築
    let q = "trashed=false";
    if (query) {
      q += ` and name contains '${query}'`;
    }

    const response = await fetch(
      `${DRIVE_API_BASE}/files?pageSize=${pageSize}&q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
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
    
    if (!session?.accessToken) {
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

    // ファイル内容をArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // メタデータ
    const metadata = {
      name: name || file.name,
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
          Authorization: `Bearer ${session.accessToken}`,
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
