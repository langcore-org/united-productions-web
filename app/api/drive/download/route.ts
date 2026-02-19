/**
 * Google Drive Download API Route
 * 
 * GET /api/drive/download?fileId=xxx - ファイル内容を取得
 * 
 * Google Workspaceファイル（Docs, Sheets, Slides）は自動的にエクスポート
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

// Google Workspaceファイルのエクスポート設定
const GOOGLE_WORKSPACE_EXPORTS: Record<string, { mimeType: string; ext: string }> = {
  // Google Docs
  "application/vnd.google-apps.document": {
    mimeType: "text/plain",
    ext: ".txt",
  },
  // Google Sheets
  "application/vnd.google-apps.spreadsheet": {
    mimeType: "text/csv",
    ext: ".csv",
  },
  // Google Slides
  "application/vnd.google-apps.presentation": {
    mimeType: "text/plain",
    ext: ".txt",
  },
};

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
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { error: "fileIdが必要です" },
        { status: 400 }
      );
    }

    // ファイルメタデータを取得
    const metaResponse = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}?fields=id,name,mimeType,size,modifiedTime`,
      {
        headers: {
          Authorization: `Bearer ${typedSession.accessToken}`,
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
    const isGoogleWorkspaceFile = metadata.mimeType.startsWith("application/vnd.google-apps.");

    let content: string;
    let exportExt = "";

    if (isGoogleWorkspaceFile && GOOGLE_WORKSPACE_EXPORTS[metadata.mimeType]) {
      // Google Workspaceファイルはエクスポート
      const exportConfig = GOOGLE_WORKSPACE_EXPORTS[metadata.mimeType];
      const exportResponse = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(exportConfig.mimeType)}`,
        {
          headers: {
            Authorization: `Bearer ${typedSession.accessToken}`,
          },
        }
      );

      if (!exportResponse.ok) {
        const errorData = await exportResponse.json().catch(() => ({}));
        return NextResponse.json(
          { error: `ファイルのエクスポートに失敗しました: ${errorData.error?.message || exportResponse.statusText}` },
          { status: exportResponse.status }
        );
      }

      content = await exportResponse.text();
      exportExt = exportConfig.ext;
    } else {
      // 通常のファイルは直接ダウンロード
      const contentResponse = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${typedSession.accessToken}`,
          },
        }
      );

      if (!contentResponse.ok) {
        return NextResponse.json(
          { error: "ファイルの取得に失敗しました" },
          { status: contentResponse.status }
        );
      }

      content = await contentResponse.text();
    }

    return NextResponse.json({
      metadata: {
        id: metadata.id,
        name: metadata.name + (isGoogleWorkspaceFile ? exportExt : ""),
        originalName: metadata.name,
        mimeType: metadata.mimeType,
        size: metadata.size,
        modifiedTime: metadata.modifiedTime,
        isGoogleWorkspaceFile,
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
