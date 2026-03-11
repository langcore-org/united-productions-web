/**
 * Google Drive API 連携モジュール
 *
 * Google Drive API v3 を使用したファイル操作機能
 * Supabase Auth 経由の Google OAuth provider_token を使用
 */

import { createClient } from "@/lib/supabase/server";

const DRIVE_API_BASE_URL = "https://www.googleapis.com/drive/v3";

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

export interface DriveFileListResponse {
  files: DriveFile[];
  nextPageToken?: string;
  incompleteSearch?: boolean;
}

export interface DriveSearchOptions {
  query?: string;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  fields?: string;
}

async function getAccessToken(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.provider_token) {
    throw new Error("Google Driveアクセスのための認証が必要です");
  }

  return session.provider_token;
}

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

export async function listFilesInFolder(
  folderId: string,
  options: Omit<DriveSearchOptions, "query"> = {},
): Promise<DriveFileListResponse> {
  const query = `'${folderId}' in parents and trashed = false`;
  return searchFiles(query, options);
}

export async function searchFilesByName(
  fileName: string,
  options: Omit<DriveSearchOptions, "query"> = {},
): Promise<DriveFileListResponse> {
  const query = `name contains '${fileName.replace(/'/g, "\\'")}' and trashed = false`;
  return searchFiles(query, options);
}

export async function searchFilesByMimeType(
  mimeType: string,
  options: Omit<DriveSearchOptions, "query"> = {},
): Promise<DriveFileListResponse> {
  const query = `mimeType = '${mimeType}' and trashed = false`;
  return searchFiles(query, options);
}

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

export async function getFileMetadata(
  fileId: string,
  fields: string = "id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,parents,description",
): Promise<DriveFile> {
  const params = new URLSearchParams({ fields });
  return driveApiRequest<DriveFile>(`/files/${fileId}?${params.toString()}`);
}

export async function getImagePreviewUrl(
  fileId: string,
  size: "small" | "medium" | "large" = "large",
): Promise<{ thumbnailUrl: string | null; webViewLink: string | null }> {
  const metadata = await getFileMetadata(fileId, "thumbnailLink,webViewLink,mimeType");

  if (!metadata.mimeType?.startsWith("image/")) {
    return {
      thumbnailUrl: null,
      webViewLink: metadata.webViewLink || null,
    };
  }

  let thumbnailUrl = metadata.thumbnailLink || null;
  if (thumbnailUrl) {
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

export async function getGoogleDocAsText(fileId: string): Promise<string> {
  return exportFile(fileId, "text/plain");
}

export async function getGoogleDocAsMarkdown(fileId: string): Promise<string> {
  return exportFile(fileId, "text/markdown");
}

export async function getGoogleSheetAsCsv(fileId: string): Promise<string> {
  return exportFile(fileId, "text/csv");
}

export async function getFileDownloadUrl(fileId: string): Promise<string> {
  const accessToken = await getAccessToken();
  const metadata = await getFileMetadata(fileId, "webContentLink,name");

  if (!metadata.webContentLink) {
    return `${DRIVE_API_BASE_URL}/files/${fileId}?alt=media&access_token=${encodeURIComponent(accessToken)}`;
  }

  return metadata.webContentLink;
}

export const DriveSearchQueries = {
  allFiles: "trashed = false",
  allFolders: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
  allImages: "mimeType contains 'image/' and trashed = false",
  allPdfs: "mimeType = 'application/pdf' and trashed = false",
  allTextFiles: "mimeType = 'text/plain' and trashed = false",
  allGoogleDocs: "mimeType = 'application/vnd.google-apps.document' and trashed = false",
  allGoogleSheets: "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
  recentlyModified: `modifiedTime > '${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}' and trashed = false`,
  sharedFiles: "sharedWithMe = true and trashed = false",
  starredFiles: "starred = true and trashed = false",
} as const;

export const MimeTypes = {
  GOOGLE_FOLDER: "application/vnd.google-apps.folder",
  GOOGLE_DOC: "application/vnd.google-apps.document",
  GOOGLE_SHEET: "application/vnd.google-apps.spreadsheet",
  GOOGLE_SLIDE: "application/vnd.google-apps.presentation",
  GOOGLE_FORM: "application/vnd.google-apps.form",
  GOOGLE_DRAWING: "application/vnd.google-apps.drawing",
  FOLDER: "application/vnd.google-apps.folder",
  PDF: "application/pdf",
  TEXT: "text/plain",
  HTML: "text/html",
  MARKDOWN: "text/markdown",
  JPEG: "image/jpeg",
  PNG: "image/png",
  GIF: "image/gif",
  BMP: "image/bmp",
  SVG: "image/svg+xml",
  WEBP: "image/webp",
  WORD: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  EXCEL: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  POWERPOINT: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;
