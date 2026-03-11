/**
 * Google Drive Download API Route
 *
 * GET /api/drive/download?fileId=xxx - ファイル内容を取得
 *
 * Google Workspaceファイル（Docs, Sheets, Slides）は自動的にエクスポート
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

const GOOGLE_WORKSPACE_EXPORTS: Record<string, { mimeType: string; ext: string }> = {
  "application/vnd.google-apps.document": {
    mimeType: "text/plain",
    ext: ".txt",
  },
  "application/vnd.google-apps.spreadsheet": {
    mimeType: "text/csv",
    ext: ".csv",
  },
  "application/vnd.google-apps.presentation": {
    mimeType: "text/plain",
    ext: ".txt",
  },
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.provider_token) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const accessToken = session.provider_token;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "fileIdが必要です" }, { status: 400 });
    }

    const metaResponse = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}?fields=id,name,mimeType,size,modifiedTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!metaResponse.ok) {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
    }

    const metadata = await metaResponse.json();
    const isGoogleWorkspaceFile = metadata.mimeType.startsWith("application/vnd.google-apps.");

    let content: string;
    let exportExt = "";

    if (isGoogleWorkspaceFile && GOOGLE_WORKSPACE_EXPORTS[metadata.mimeType]) {
      const exportConfig = GOOGLE_WORKSPACE_EXPORTS[metadata.mimeType];
      const exportResponse = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(exportConfig.mimeType)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!exportResponse.ok) {
        const errorData = await exportResponse.json().catch(() => ({}));
        return NextResponse.json(
          {
            error: `ファイルのエクスポートに失敗しました: ${errorData.error?.message || exportResponse.statusText}`,
          },
          { status: exportResponse.status },
        );
      }

      content = await exportResponse.text();
      exportExt = exportConfig.ext;
    } else {
      const contentResponse = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!contentResponse.ok) {
        return NextResponse.json(
          { error: "ファイルの取得に失敗しました" },
          { status: contentResponse.status },
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
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
