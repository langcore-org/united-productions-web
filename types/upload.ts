/**
 * ファイルアップロード関連の型定義
 */

export const FILE_TYPE_MAP = {
  ".txt": { mime: "text/plain", category: "text" },
  ".md": { mime: "text/markdown", category: "text" },
  ".csv": { mime: "text/csv", category: "text" },
  ".json": { mime: "application/json", category: "text" },
  ".vtt": { mime: "text/vtt", category: "text" },
  ".docx": {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    category: "document",
  },
  ".pdf": { mime: "application/pdf", category: "document" },
  ".xlsx": {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    category: "document",
  },
  ".xls": { mime: "application/vnd.ms-excel", category: "document" },
  ".pptx": {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    category: "document",
  },
  ".png": { mime: "image/png", category: "image" },
  ".jpg": { mime: "image/jpeg", category: "image" },
  ".jpeg": { mime: "image/jpeg", category: "image" },
  ".gif": { mime: "image/gif", category: "image" },
  ".webp": { mime: "image/webp", category: "image" },
  ".js": { mime: "text/javascript", category: "code" },
  ".ts": { mime: "text/typescript", category: "code" },
  ".tsx": { mime: "text/tsx", category: "code" },
  ".jsx": { mime: "text/jsx", category: "code" },
  ".py": { mime: "text/x-python", category: "code" },
  ".html": { mime: "text/html", category: "code" },
  ".css": { mime: "text/css", category: "code" },
} as const;

export type SupportedFileExtension = keyof typeof FILE_TYPE_MAP;
export type FileCategory = (typeof FILE_TYPE_MAP)[SupportedFileExtension]["category"];
export type SupportedFileType = (typeof FILE_TYPE_MAP)[SupportedFileExtension]["mime"];

export const SUPPORTED_FILE_EXTENSIONS = Object.keys(FILE_TYPE_MAP) as SupportedFileExtension[];
export const UPLOAD_SUPPORTED_EXTENSIONS: SupportedFileExtension[] = [
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".vtt",
  ".docx",
  ".pdf",
  ".xlsx",
  ".xls",
];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string | null;
}

export interface FileUploadRequest {
  file: File;
}

export interface FileUploadResponse {
  success: boolean;
  data?: {
    text: string;
    filename: string;
    size: number;
  };
  error?: string;
}

export interface FileValidationError {
  code: "FILE_TOO_LARGE" | "UNSUPPORTED_TYPE" | "EMPTY_FILE" | "ENCODING_ERROR";
  message: string;
}

export interface ParsedFile {
  text: string;
  filename: string;
  size: number;
  encoding: string;
}

export interface ParseError {
  code: "FILE_TOO_LARGE" | "UNSUPPORTED_TYPE" | "EMPTY_FILE" | "ENCODING_ERROR" | "PARSE_ERROR";
  message: string;
}

function hasCategory(ext: SupportedFileExtension, categories: FileCategory[]): boolean {
  return categories.includes(FILE_TYPE_MAP[ext].category);
}

export function getAcceptRecord(categories: FileCategory[]): Record<string, string[]> {
  const record: Record<string, string[]> = {};
  for (const ext of SUPPORTED_FILE_EXTENSIONS) {
    if (!hasCategory(ext, categories)) continue;
    const mime = FILE_TYPE_MAP[ext].mime;
    if (!record[mime]) record[mime] = [];
    record[mime].push(ext);
  }
  return record;
}

export function getAcceptString(categories: FileCategory[]): string {
  return SUPPORTED_FILE_EXTENSIONS.filter((ext) => hasCategory(ext, categories)).join(",");
}

export function getUploadAcceptRecord(): Record<string, string[]> {
  const record: Record<string, string[]> = {};
  for (const ext of UPLOAD_SUPPORTED_EXTENSIONS) {
    const mime = FILE_TYPE_MAP[ext].mime;
    if (!record[mime]) record[mime] = [];
    record[mime].push(ext);
  }
  return record;
}

export function getChatAcceptRecord(): Record<string, string[]> {
  return getAcceptRecord(["text", "document", "image", "code"]);
}

export function getChatAcceptString(): string {
  return getAcceptString(["text", "document", "image", "code"]);
}

export function getSupportedExtensionsList(categories: FileCategory[]): string {
  return SUPPORTED_FILE_EXTENSIONS.filter((ext) => hasCategory(ext, categories)).join(", ");
}

export function getUploadSupportedExtensionsList(): string {
  return UPLOAD_SUPPORTED_EXTENSIONS.join(", ");
}

export function getMimeByExtension(filename: string): string {
  const ext = `.${filename.toLowerCase().split(".").pop() || ""}` as SupportedFileExtension;
  return FILE_TYPE_MAP[ext]?.mime || "application/octet-stream";
}
