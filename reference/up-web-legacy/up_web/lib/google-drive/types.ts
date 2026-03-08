/**
 * Google Drive Types
 * 共通の型定義
 */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  webViewLink?: string;
  iconLink?: string;
  modifiedTime?: string;
  size?: string;
}

export interface DriveFolder extends DriveFile {
  mimeType: "application/vnd.google-apps.folder";
}

export interface SharedDrive {
  id: string;
  name: string;
}

export interface FolderContents {
  files: DriveFile[];
  folders: DriveFolder[];
  nextPageToken?: string;
  // Extended fields for caching
  folderInfo?: DriveFile | null;
  path?: string | null;
}

export interface DriveConnectionStatus {
  connected: boolean;
  clientEmail?: string;
  sharedDrives?: SharedDrive[];
}

export interface FolderAccessResult {
  accessible: boolean;
  name?: string;
  path?: string;
  fileCount?: number;
  writable?: boolean;
}

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id: string;
}
