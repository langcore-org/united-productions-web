/**
 * ファイル解析ユーティリティ
 * 各種ファイル形式からテキストを抽出
 */

import * as mammoth from "mammoth";
import type { ParsedFile, ParseError } from "@/types/upload";

// サポートされるMIMEタイプ
export const SUPPORTED_MIME_TYPES = [
  "text/plain",
  "text/vtt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// 最大ファイルサイズ (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * ファイルを解析してテキストを抽出
 */
export async function parseFile(
  file: File,
  options: { maxSize?: number } = {},
): Promise<ParsedFile> {
  const maxSize = options.maxSize || MAX_FILE_SIZE;

  // ファイルサイズチェック
  if (file.size > maxSize) {
    throw createError(
      "FILE_TOO_LARGE",
      `ファイルサイズは${formatBytes(maxSize)}以下にしてください`,
    );
  }

  // 空ファイルチェック
  if (file.size === 0) {
    throw createError("EMPTY_FILE", "ファイルが空です");
  }

  // MIMEタイプ判定
  const mimeType = file.type || detectMimeType(file.name);

  switch (mimeType) {
    case "text/plain":
      return parseTextFile(file);

    case "text/vtt":
      return parseVTTFile(file);

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return parseDocxFile(file);

    default:
      // 拡張子で判定を試みる
      if (file.name.endsWith(".txt")) {
        return parseTextFile(file);
      } else if (file.name.endsWith(".vtt")) {
        return parseVTTFile(file);
      } else if (file.name.endsWith(".docx")) {
        return parseDocxFile(file);
      }

      throw createError(
        "UNSUPPORTED_TYPE",
        "サポートされていないファイル形式です (.txt, .vtt, .docx)",
      );
  }
}

/**
 * テキストファイル解析
 */
async function parseTextFile(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  // 文字コード判定
  const encoding = detectEncoding(uint8Array);

  try {
    let text: string;

    if (encoding === "UTF-8") {
      text = new TextDecoder("utf-8", { fatal: true }).decode(uint8Array);
    } else if (encoding === "Shift_JIS") {
      // Shift_JISデコード
      text = new TextDecoder("shift_jis", { fatal: false }).decode(uint8Array);
    } else {
      text = new TextDecoder("utf-8", { fatal: false }).decode(uint8Array);
    }

    return {
      text: normalizeText(text),
      filename: file.name,
      size: file.size,
      encoding,
    };
  } catch (_error) {
    throw createError("ENCODING_ERROR", "文字コードの変換に失敗しました");
  }
}

/**
 * VTTファイル解析
 */
async function parseVTTFile(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);
  const encoding = detectEncoding(uint8Array);

  try {
    let text: string;

    if (encoding === "UTF-8") {
      text = new TextDecoder("utf-8", { fatal: true }).decode(uint8Array);
    } else {
      text = new TextDecoder("shift_jis", { fatal: false }).decode(uint8Array);
    }

    // VTTフォーマットからテキストを抽出
    const extractedText = extractVTTText(text);

    return {
      text: extractedText,
      filename: file.name,
      size: file.size,
      encoding,
    };
  } catch (_error) {
    throw createError("PARSE_ERROR", "VTTファイルの解析に失敗しました");
  }
}

/**
 * DOCXファイル解析
 */
async function parseDocxFile(file: File): Promise<ParsedFile> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });

    return {
      text: normalizeText(result.value),
      filename: file.name,
      size: file.size,
      encoding: "UTF-8",
    };
  } catch (_error) {
    throw createError("PARSE_ERROR", "Wordファイルの解析に失敗しました");
  }
}

/**
 * VTTテキストから字幕テキストを抽出
 */
function extractVTTText(vttContent: string): string {
  const lines = vttContent.split("\n");
  const textLines: string[] = [];
  let isInCue = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // WEBVTTヘッダーをスキップ
    if (trimmed === "WEBVTT") continue;

    // タイムスタンプ行をスキップ (00:00:00.000 --> 00:00:00.000)
    if (trimmed.match(/^\d{2}:\d{2}:\d{2}\.\d{3}/)) {
      isInCue = true;
      continue;
    }

    // 空行でキュー終了
    if (trimmed === "") {
      isInCue = false;
      continue;
    }

    // キュー内のテキストを抽出
    if (isInCue && trimmed) {
      textLines.push(trimmed);
    }
  }

  return textLines.join("\n");
}

/**
 * 文字コード判定
 */
function detectEncoding(uint8Array: Uint8Array): string {
  // BOMチェック
  if (
    uint8Array.length >= 3 &&
    uint8Array[0] === 0xef &&
    uint8Array[1] === 0xbb &&
    uint8Array[2] === 0xbf
  ) {
    return "UTF-8";
  }

  // UTF-8の妥当性チェック
  if (isValidUTF8(uint8Array)) {
    return "UTF-8";
  }

  // Shift_JISと仮定
  return "Shift_JIS";
}

/**
 * UTF-8妥当性チェック
 */
function isValidUTF8(uint8Array: Uint8Array): boolean {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    decoder.decode(uint8Array);
    return true;
  } catch {
    return false;
  }
}

/**
 * MIMEタイプ判定（フォールバック）
 */
function detectMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  switch (ext) {
    case "txt":
      return "text/plain";
    case "vtt":
      return "text/vtt";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

/**
 * テキスト正規化
 */
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n") // Windows改行を統一
    .replace(/\r/g, "\n") // Mac改行を統一
    .replace(/\n{3,}/g, "\n\n") // 連続改行を2つに制限
    .trim();
}

/**
 * エラーオブジェクト作成
 */
function createError(code: ParseError["code"], message: string): ParseError {
  return { code, message };
}

/**
 * バイト数を人間可読形式に変換
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}
