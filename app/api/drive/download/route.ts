/**
 * Google Drive Download API Route
 * 
 * GET /api/drive/download?fileId=xxx - ファイル内容を取得
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

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
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { error: "fileIdが必要です" },
        { status: 400 }
      );
    }

    // ファイルメタデータを取得
    const metaResponse = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}?fields=id,name,mimeType,size`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!metaResponse.ok) {
      return NextResponse.json(
        { error: "ファイルが見つかりません" },
        { status: 404 }
      );
    }

    const metadata = await metaResponse.json();

    // ファイル内容を取得
    const contentResponse = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!contentResponse.ok) {
      return NextResponse.json(
        { error: "ファイルの取得に失敗しました" },
        { status: contentResponse.status }
      );
    }

    const content = await contentResponse.text();

    return NextResponse.json({
      metadata: {
        id: metadata.id,
        name: metadata.name,
        mimeType: metadata.mimeType,
        size: metadata.size,
      },
      content,
    });

  } catch (error) {
    console.error("Drive download error:", error);
    return NextResponse.json(
      { error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
