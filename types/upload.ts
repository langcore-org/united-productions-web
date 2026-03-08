/**
 * ファイルアップロード関連の型定義
 */

export type SupportedFileType =
  | "text/plain"
  | "text/vtt"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const SUPPORTED_FILE_EXTENSIONS = [".txt", ".vtt", ".docx"] as const;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
