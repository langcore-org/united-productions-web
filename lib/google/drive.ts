/**
 * Google Drive API 連携モジュール
 * AI Hub - United Productions 制作支援統合プラットフォーム
 *
 * Google Drive API v3 を使用したファイル操作機能
 * - ファイル一覧取得
 * - ファイル検索
 * - テキストファイルの内容取得
 * - 画像ファイルのプレビューURL取得
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

/**
 * Google Drive API のベースURL
 */
const DRIVE_API_BASE_URL = "https://www.googleapis.com/drive/v3";

/**
 * Google Drive ファイルメタデータ型
 */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  parents?: string[];
  description?: string;
}

/**
 * ファイル一覧取得のレスポンス型
 */
export interface DriveFileListResponse {
  files: DriveFile[];
  nextPageToken?: string;
  incompleteSearch?: boolean;
}

/**
 * ファイル検索オプション
 */
export interface DriveSearchOptions {
  query?: string;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  fields?: string;
}

/**
 * アクセストークンを取得する
 * @returns アクセストークン
 * @throws 認証エラー
 */
import type { Session } from "next-auth";

async function getAccessToken(): Promise<string> {
  const session = await getServerSession(authOptions);
  const typedSession = session as Session | null;

  if (!typedSession?.accessToken) {
    throw new Error("Google Driveアクセスのための認証が必要です");
  }

  return typedSession.accessToken;
}

/**
 * Google Drive API リクエストを実行する
 * @param endpoint APIエンドポイント
 * @param options リクエストオプション
 * @returns APIレスポンス
 */
async function driveApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();

  const url = `${DRIVE_API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Google Drive APIエラー: ${response.status} ${response.statusText} - ${errorData.error?.message || "Unknown error"}`,
    );
  }

  return response.json();
}

/**
 * ファイル一覧を取得する
 * @param options 検索オプション
 * @returns ファイル一覧
 */
export async function listFiles(options: DriveSearchOptions = {}): Promise<DriveFileListResponse> {
  const {
    pageSize = 100,
    pageToken,
    orderBy = "modifiedTime desc",
    fields = "files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,parents,description),nextPageToken,incompleteSearch",
  } = options;

  const params = new URLSearchParams({
    pageSize: pageSize.toString(),
    orderBy,
    fields,
  });

  if (pageToken) {
    params.append("pageToken", pageToken);
  }

  return driveApiRequest<DriveFileListResponse>(`/files?${params.toString()}`);
}

/**
 * ファイルを検索する
 * @param query 検索クエリ（Google Drive検索クエリ構文）
 * @param options 検索オプション
 * @returns 検索結果
 */
export async function searchFiles(
  query: string,
  options: Omit<DriveSearchOptions, "query"> = {},
): Promise<DriveFileListResponse> {
  const {
    pageSize = 100,
    pageToken,
    orderBy = "modifiedTime desc",
    fields = "files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,parents,description),nextPageToken,incompleteSearch",
  } = options;

  const params = new URLSearchParams({
    q: query,
    pageSize: pageSize.toString(),
    orderBy,
    fields,
  });

  if (pageToken) {
    params.append("pageToken", pageToken);
  }

  return driveApiRequest<DriveFileListResponse>(`/files?${params.toString()}`);
}

/**
 * 特定のフォルダ内のファイルを取得する
 * @param folderId フォルダID
 * @param options 検索オプション
 * @returns ファイル一覧
 */
export async function listFilesInFolder(
  folderId: string,
  options: Omit<DriveSearchOptions, "query"> = {},
): Promise<DriveFileListResponse> {
  const query = `'${folderId}' in parents and trashed = false`;
  return searchFiles(query, options);
}

/**
 * ファイル名で検索する
 * @param fileName 検索するファイル名（部分一致）
 * @param options 検索オプション
 * @returns 検索結果
 */
export async function searchFilesByName(
  fileName: string,
  options: Omit<DriveSearchOptions, "query"> = {},
): Promise<DriveFileListResponse> {
  const query = `name contains '${fileName.replace(/'/g, "\\'")}' and trashed = false`;
  return searchFiles(query, options);
}

/**
 * MIMEタイプでファイルを検索する
 * @param mimeType MIMEタイプ（例: "application/pdf", "image/jpeg"）
 * @param options 検索オプション
 * @returns 検索結果
 */
export async function searchFilesByMimeType(
  mimeType: string,
  options: Omit<DriveSearchOptions, "query"> = {},
): Promise<DriveFileListResponse> {
  const query = `mimeType = '${mimeType}' and trashed = false`;
  return searchFiles(query, options);
}

/**
 * テキストファイルの内容を取得する
 * @param fileId ファイルID
 * @returns ファイルの内容（テキスト）
 */
export async function getTextFileContent(fileId: string): Promise<string> {
  const accessToken = await getAccessToken();

  const url = `${DRIVE_API_BASE_URL}/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `ファイル内容の取得に失敗しました: ${response.status} ${response.statusText} - ${errorData.error?.message || "Unknown error"}`,
    );
  }

  return response.text();
}

/**
 * ファイルメタデータを取得する
 * @param fileId ファイルID
 * @param fields 取得するフィールド（カンマ区切り）
 * @returns ファイルメタデータ
 */
export async function getFileMetadata(
  fileId: string,
  fields: string = "id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,parents,description",
): Promise<DriveFile> {
  const params = new URLSearchParams({ fields });
  return driveApiRequest<DriveFile>(`/files/${fileId}?${params.toString()}`);
}

/**
 * 画像ファイルのプレビューURLを取得する
 * @param fileId ファイルID
 * @param size サムネイルサイズ（デフォルト: "large"）
 * @returns プレビューURL情報
 */
export async function getImagePreviewUrl(
  fileId: string,
  size: "small" | "medium" | "large" = "large",
): Promise<{ thumbnailUrl: string | null; webViewLink: string | null }> {
  const metadata = await getFileMetadata(fileId, "thumbnailLink,webViewLink,mimeType");

  // 画像ファイルでない場合
  if (!metadata.mimeType?.startsWith("image/")) {
    return {
      thumbnailUrl: null,
      webViewLink: metadata.webViewLink || null,
    };
  }

  // サムネイルURLのサイズを調整
  let thumbnailUrl = metadata.thumbnailLink || null;
  if (thumbnailUrl) {
    // Google DriveのサムネイルURLはデフォルトで小さいサイズなので、
    // 必要に応じてサイズパラメータを調整
    switch (size) {
      case "small":
        thumbnailUrl = thumbnailUrl.replace("=s220", "=s100");
        break;
      case "medium":
        thumbnailUrl = thumbnailUrl.replace("=s220", "=s400");
        break;
      case "large":
        thumbnailUrl = thumbnailUrl.replace("=s220", "=s800");
        break;
    }
  }

  return {
    thumbnailUrl,
    webViewLink: metadata.webViewLink || null,
  };
}

/**
 * ファイルをエクスポートする（Google Workspaceドキュメントなど）
 * @param fileId ファイルID
 * @param mimeType エクスポート先のMIMEタイプ
 * @returns エクスポートされたファイルの内容
 */
export async function exportFile(fileId: string, mimeType: string): Promise<string> {
  const accessToken = await getAccessToken();

  const params = new URLSearchParams({ mimeType });
  const url = `${DRIVE_API_BASE_URL}/files/${fileId}/export?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `ファイルのエクスポートに失敗しました: ${response.status} ${response.statusText} - ${errorData.error?.message || "Unknown error"}`,
    );
  }

  return response.text();
}

/**
 * Googleドキュメントをプレーンテキストとして取得する
 * @param fileId ファイルID
 * @returns ドキュメントの内容（プレーンテキスト）
 */
export async function getGoogleDocAsText(fileId: string): Promise<string> {
  return exportFile(fileId, "text/plain");
}

/**
 * GoogleドキュメントをMarkdownとして取得する
 * @param fileId ファイルID
 * @returns ドキュメントの内容（Markdown）
 */
export async function getGoogleDocAsMarkdown(fileId: string): Promise<string> {
  return exportFile(fileId, "text/markdown");
}

/**
 * GoogleスプレッドシートをCSVとして取得する
 * @param fileId ファイルID
 * @returns スプレッドシートの内容（CSV）
 */
export async function getGoogleSheetAsCsv(fileId: string): Promise<string> {
  return exportFile(fileId, "text/csv");
}

/**
 * ファイルのダウンロードURLを取得する
 * @param fileId ファイルID
 * @returns ダウンロードURL
 */
export async function getFileDownloadUrl(fileId: string): Promise<string> {
  const accessToken = await getAccessToken();
  const metadata = await getFileMetadata(fileId, "webContentLink,name");

  // 直接ダウンロードリンクがない場合は、API経由のダウンロードURLを生成
  if (!metadata.webContentLink) {
    return `${DRIVE_API_BASE_URL}/files/${fileId}?alt=media&access_token=${encodeURIComponent(accessToken)}`;
  }

  return metadata.webContentLink;
}

/**
 * よく使用する検索クエリのプリセット
 */
export const DriveSearchQueries = {
  /** すべてのファイル（ゴミ箱除外） */
  allFiles: "trashed = false",
  /** すべてのフォルダ */
  allFolders: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
  /** 画像ファイル */
  allImages: "mimeType contains 'image/' and trashed = false",
  /** PDFファイル */
  allPdfs: "mimeType = 'application/pdf' and trashed = false",
  /** テキストファイル */
  allTextFiles: "mimeType = 'text/plain' and trashed = false",
  /** Googleドキュメント */
  allGoogleDocs: "mimeType = 'application/vnd.google-apps.document' and trashed = false",
  /** Googleスプレッドシート */
  allGoogleSheets: "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
  /** 最近更新されたファイル（過去7日間） */
  recentlyModified:
    "modifiedTime > '${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}' and trashed = false",
  /** 共有ファイル */
  sharedFiles: "sharedWithMe = true and trashed = false",
  /** スター付きファイル */
  starredFiles: "starred = true and trashed = false",
} as const;

/**
 * よく使用するMIMEタイプ
 */
export const MimeTypes = {
  // Google Workspace
  GOOGLE_FOLDER: "application/vnd.google-apps.folder",
  GOOGLE_DOC: "application/vnd.google-apps.document",
  GOOGLE_SHEET: "application/vnd.google-apps.spreadsheet",
  GOOGLE_SLIDE: "application/vnd.google-apps.presentation",
  GOOGLE_FORM: "application/vnd.google-apps.form",
  GOOGLE_DRAWING: "application/vnd.google-apps.drawing",

  // 一般的なファイル
  FOLDER: "application/vnd.google-apps.folder",
  PDF: "application/pdf",
  TEXT: "text/plain",
  HTML: "text/html",
  MARKDOWN: "text/markdown",

  // 画像
  JPEG: "image/jpeg",
  PNG: "image/png",
  GIF: "image/gif",
  BMP: "image/bmp",
  SVG: "image/svg+xml",
  WEBP: "image/webp",

  // Microsoft Office
  WORD: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  EXCEL: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  POWERPOINT: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;
