/**
 * Google Drive Client
 * サーバーサイドで使用するDrive APIクライアント
 */

import { google, drive_v3 } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import type {
  DriveFile,
  DriveFolder,
  SharedDrive,
  FolderContents,
  ServiceAccountCredentials,
} from "./types";

const ENCRYPTION_KEY =
  process.env.GOOGLE_CREDENTIALS_ENCRYPTION_KEY ||
  "dev-encryption-key-32chars!!";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

// Spreadsheet MIME types to exclude (AI cannot process unstructured spreadsheets well)
const EXCLUDED_MIME_TYPES = new Set([
  "application/vnd.google-apps.spreadsheet", // Google Sheets
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "application/vnd.oasis.opendocument.spreadsheet", // .ods
]);

/**
 * ワークスペースのService Account情報を取得
 */
export async function getServiceAccountCredentials(
  workspaceId: string
): Promise<ServiceAccountCredentials | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_workspace_service_account", {
    p_workspace_id: workspaceId,
    p_encryption_key: ENCRYPTION_KEY,
  });

  if (error || !data) {
    return null;
  }

  try {
    return JSON.parse(data) as ServiceAccountCredentials;
  } catch {
    return null;
  }
}

/**
 * Google Drive APIクライアントを作成
 */
export function createDriveClient(
  credentials: ServiceAccountCredentials
): drive_v3.Drive {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    scopes: [
      "https://www.googleapis.com/auth/drive", // Full access for delete operations
    ],
  });

  return google.drive({ version: "v3", auth });
}

/**
 * ワークスペースのDriveクライアントを取得
 */
export async function getDriveClientForWorkspace(
  workspaceId: string
): Promise<drive_v3.Drive | null> {
  const credentials = await getServiceAccountCredentials(workspaceId);
  if (!credentials) {
    return null;
  }
  return createDriveClient(credentials);
}

/**
 * 共有ドライブ一覧を取得
 */
export async function listSharedDrives(
  drive: drive_v3.Drive
): Promise<SharedDrive[]> {
  try {
    const response = await drive.drives.list({
      pageSize: 100,
      fields: "drives(id, name)",
    });

    return (response.data.drives || []).map((d) => ({
      id: d.id!,
      name: d.name!,
    }));
  } catch {
    return [];
  }
}

/**
 * Service Accountがアクセス可能なルートフォルダ一覧を取得
 * （共有されたフォルダ）
 */
export async function listAccessibleRootFolders(
  drive: drive_v3.Drive
): Promise<DriveFolder[]> {
  try {
    // Service Accountがアクセス可能なフォルダを取得
    // 親がないか、親にアクセスできないフォルダ = ルートレベル
    const response = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and 'me' in readers",
      pageSize: 100,
      fields: "files(id, name, mimeType, parents, webViewLink)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const folders: DriveFolder[] = [];
    const allFolderIds = new Set(
      (response.data.files || []).map((f) => f.id!)
    );

    // 親フォルダが結果に含まれていないフォルダ = ルートレベル
    for (const file of response.data.files || []) {
      const hasAccessibleParent =
        file.parents && file.parents.some((p) => allFolderIds.has(p));

      if (!hasAccessibleParent) {
        folders.push({
          id: file.id!,
          name: file.name!,
          mimeType: "application/vnd.google-apps.folder",
          parents: file.parents || undefined,
          webViewLink: file.webViewLink || undefined,
        });
      }
    }

    return folders;
  } catch (error) {
    console.error("Error listing accessible folders:", error);
    return [];
  }
}

/**
 * フォルダの内容を取得
 */
export async function listFolderContents(
  drive: drive_v3.Drive,
  folderId: string,
  pageToken?: string
): Promise<FolderContents> {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    pageSize: 100,
    pageToken,
    fields:
      "nextPageToken, files(id, name, mimeType, parents, webViewLink, iconLink, modifiedTime, size)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    orderBy: "folder, name",
  });

  const files: DriveFile[] = [];
  const folders: DriveFolder[] = [];

  for (const file of response.data.files || []) {
    // Skip hidden files (starting with .)
    if (file.name?.startsWith(".")) {
      continue;
    }
    // Skip excluded MIME types (spreadsheets)
    if (EXCLUDED_MIME_TYPES.has(file.mimeType!)) {
      continue;
    }

    const item: DriveFile = {
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      parents: file.parents || undefined,
      webViewLink: file.webViewLink || undefined,
      iconLink: file.iconLink || undefined,
      modifiedTime: file.modifiedTime || undefined,
      size: file.size || undefined,
    };

    if (file.mimeType === FOLDER_MIME_TYPE) {
      folders.push(item as DriveFolder);
    } else {
      files.push(item);
    }
  }

  return {
    files,
    folders,
    nextPageToken: response.data.nextPageToken || undefined,
  };
}

/**
 * 共有ドライブのルートフォルダを取得
 */
export async function listSharedDriveContents(
  drive: drive_v3.Drive,
  driveId: string,
  pageToken?: string
): Promise<FolderContents> {
  const response = await drive.files.list({
    q: `'${driveId}' in parents and trashed = false`,
    pageSize: 100,
    pageToken,
    fields:
      "nextPageToken, files(id, name, mimeType, parents, webViewLink, iconLink, modifiedTime, size)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    driveId,
    corpora: "drive",
    orderBy: "folder, name",
  });

  const files: DriveFile[] = [];
  const folders: DriveFolder[] = [];

  for (const file of response.data.files || []) {
    // Skip hidden files (starting with .)
    if (file.name?.startsWith(".")) {
      continue;
    }
    // Skip excluded MIME types (spreadsheets)
    if (EXCLUDED_MIME_TYPES.has(file.mimeType!)) {
      continue;
    }

    const item: DriveFile = {
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      parents: file.parents || undefined,
      webViewLink: file.webViewLink || undefined,
      iconLink: file.iconLink || undefined,
      modifiedTime: file.modifiedTime || undefined,
      size: file.size || undefined,
    };

    if (file.mimeType === FOLDER_MIME_TYPE) {
      folders.push(item as DriveFolder);
    } else {
      files.push(item);
    }
  }

  return {
    files,
    folders,
    nextPageToken: response.data.nextPageToken || undefined,
  };
}

/**
 * フォルダ情報を取得
 */
export async function getFolderInfo(
  drive: drive_v3.Drive,
  folderId: string
): Promise<DriveFolder | null> {
  try {
    const response = await drive.files.get({
      fileId: folderId,
      fields: "id, name, mimeType, parents, webViewLink",
      supportsAllDrives: true,
    });

    if (response.data.mimeType !== FOLDER_MIME_TYPE) {
      return null;
    }

    return {
      id: response.data.id!,
      name: response.data.name!,
      mimeType: FOLDER_MIME_TYPE,
      parents: response.data.parents || undefined,
      webViewLink: response.data.webViewLink || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * フォルダのパスを取得（親フォルダを辿る）
 */
export async function getFolderPath(
  drive: drive_v3.Drive,
  folderId: string
): Promise<string> {
  const pathParts: string[] = [];
  let currentId = folderId;

  // 最大10階層まで遡る
  for (let i = 0; i < 10; i++) {
    try {
      const response = await drive.files.get({
        fileId: currentId,
        fields: "id, name, parents",
        supportsAllDrives: true,
      });

      pathParts.unshift(response.data.name!);

      if (!response.data.parents || response.data.parents.length === 0) {
        break;
      }

      currentId = response.data.parents[0];
    } catch {
      break;
    }
  }

  return "/" + pathParts.join("/");
}

/**
 * ファイルをGoogle Driveにアップロード
 *
 * @param drive - Drive APIクライアント
 * @param folderId - アップロード先フォルダID
 * @param fileName - ファイル名
 * @param content - ファイル内容（Buffer）
 * @param mimeType - MIMEタイプ
 * @returns アップロードされたファイルの情報
 */
export interface UploadedFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  size?: string;
}

export async function uploadFile(
  drive: drive_v3.Drive,
  folderId: string,
  fileName: string,
  content: Buffer,
  mimeType: string
): Promise<UploadedFile> {
  const { Readable } = await import("stream");

  // Create readable stream from buffer
  const stream = new Readable();
  stream.push(content);
  stream.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType,
      body: stream,
    },
    fields: "id, name, mimeType, webViewLink, size",
    supportsAllDrives: true,
  });

  if (!response.data.id) {
    throw new Error("Failed to upload file: no file ID returned");
  }

  return {
    id: response.data.id,
    name: response.data.name || fileName,
    mimeType: response.data.mimeType || mimeType,
    webViewLink:
      response.data.webViewLink ||
      `https://drive.google.com/file/d/${response.data.id}/view`,
    size: response.data.size || undefined,
  };
}

/**
 * ワークスペースのDriveにファイルをアップロード
 * （認証情報取得からアップロードまでを一括で行う）
 */
export async function uploadFileToWorkspace(
  workspaceId: string,
  folderId: string,
  fileName: string,
  content: Buffer,
  mimeType: string
): Promise<UploadedFile | null> {
  const drive = await getDriveClientForWorkspace(workspaceId);
  if (!drive) {
    return null;
  }

  return uploadFile(drive, folderId, fileName, content, mimeType);
}

/**
 * フォルダ内のファイルを名前で検索
 * @param drive - Drive APIクライアント
 * @param folderId - 検索対象フォルダID
 * @param fileName - 検索するファイル名
 * @returns 見つかったファイル情報、見つからない場合はnull
 */
export async function findFileByName(
  drive: drive_v3.Drive,
  folderId: string,
  fileName: string
): Promise<DriveFile | null> {
  try {
    // Escape special characters in file name for search query
    const escapedName = fileName.replace(/'/g, "\\'");

    const response = await drive.files.list({
      q: `'${folderId}' in parents and name = '${escapedName}' and trashed = false`,
      pageSize: 1,
      fields: "files(id, name, mimeType, parents, webViewLink, iconLink, modifiedTime, size)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = response.data.files || [];
    if (files.length === 0) {
      return null;
    }

    const file = files[0];
    return {
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      parents: file.parents || undefined,
      webViewLink: file.webViewLink || undefined,
      iconLink: file.iconLink || undefined,
      modifiedTime: file.modifiedTime || undefined,
      size: file.size || undefined,
    };
  } catch (error) {
    console.error("Error finding file by name:", error);
    return null;
  }
}

/**
 * ワークスペースのDriveでファイルを名前で検索
 */
export async function findFileByNameInWorkspace(
  workspaceId: string,
  folderId: string,
  fileName: string
): Promise<DriveFile | null> {
  const drive = await getDriveClientForWorkspace(workspaceId);
  if (!drive) {
    return null;
  }

  return findFileByName(drive, folderId, fileName);
}
