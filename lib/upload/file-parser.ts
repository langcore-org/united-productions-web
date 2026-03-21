/**
 * ファイル解析ユーティリティ
 * 各種ファイル形式からテキストを抽出
 */

import * as mammoth from "mammoth";
import type { ParsedFile, ParseError } from "@/types/upload";
import { getMimeByExtension, getUploadSupportedExtensionsList } from "@/types/upload";

// サポートされるMIMEタイプ
export const SUPPORTED_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/vtt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
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

  if (file.size > maxSize) {
    throw createError(
      "FILE_TOO_LARGE",
      `ファイルサイズは${formatBytes(maxSize)}以下にしてください`,
    );
  }

  if (file.size === 0) {
    throw createError("EMPTY_FILE", "ファイルが空です");
  }

  const mimeType = file.type || detectMimeType(file.name);

  switch (mimeType) {
    case "text/plain":
    case "text/markdown":
    case "text/csv":
    case "application/json":
      return parseTextFile(file);

    case "text/vtt":
      return parseVTTFile(file);

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return parseDocxFile(file);

    case "application/pdf":
      return parsePdfFile(file);

    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    case "application/vnd.ms-excel":
      return parseExcelFile(file);

    default:
      if (
        file.name.endsWith(".txt") ||
        file.name.endsWith(".md") ||
        file.name.endsWith(".csv") ||
        file.name.endsWith(".json")
      ) {
        return parseTextFile(file);
      }
      if (file.name.endsWith(".vtt")) {
        return parseVTTFile(file);
      }
      if (file.name.endsWith(".docx")) {
        return parseDocxFile(file);
      }
      if (file.name.endsWith(".pdf")) {
        return parsePdfFile(file);
      }
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        return parseExcelFile(file);
      }

      throw createError(
        "UNSUPPORTED_TYPE",
        `サポートされていないファイル形式です (${getUploadSupportedExtensionsList()})`,
      );
  }
}

async function parseTextFile(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);
  const encoding = detectEncoding(uint8Array);

  try {
    let text: string;

    if (encoding === "UTF-8") {
      text = new TextDecoder("utf-8", { fatal: true }).decode(uint8Array);
    } else if (encoding === "Shift_JIS") {
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
  } catch {
    throw createError("ENCODING_ERROR", "文字コードの変換に失敗しました");
  }
}

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

    const extractedText = extractVTTText(text);

    return {
      text: extractedText,
      filename: file.name,
      size: file.size,
      encoding,
    };
  } catch {
    throw createError("PARSE_ERROR", "VTTファイルの解析に失敗しました");
  }
}

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
  } catch {
    throw createError("PARSE_ERROR", "Wordファイルの解析に失敗しました");
  }
}

async function parsePdfFile(file: File): Promise<ParsedFile> {
  try {
    const { extractText } = await import("unpdf");
    const buffer = new Uint8Array(await file.arrayBuffer());
    const { text } = await extractText(buffer, { mergePages: true });

    if (!text || text.trim().length === 0) {
      throw createError(
        "PARSE_ERROR",
        "PDFからテキストを抽出できませんでした（スキャンPDFの可能性があります）",
      );
    }

    return {
      text: normalizeText(text),
      filename: file.name,
      size: file.size,
      encoding: "UTF-8",
    };
  } catch (e) {
    if ((e as ParseError).code === "PARSE_ERROR") throw e;
    throw createError("PARSE_ERROR", "PDFファイルの解析に失敗しました");
  }
}

async function parseExcelFile(file: File): Promise<ParsedFile> {
  try {
    const XLSX = await import("xlsx");
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    let text = "";
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const sheetText = XLSX.utils.sheet_to_csv(sheet);
      text += `\n--- ${sheetName} ---\n${sheetText}`;
    }

    return {
      text: normalizeText(text),
      filename: file.name,
      size: file.size,
      encoding: "UTF-8",
    };
  } catch {
    throw createError("PARSE_ERROR", "Excelファイルの解析に失敗しました");
  }
}

function extractVTTText(vttContent: string): string {
  const lines = vttContent.split("\n");
  const textLines: string[] = [];
  let isInCue = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "WEBVTT") continue;

    if (trimmed.match(/^\d{2}:\d{2}:\d{2}\.\d{3}/)) {
      isInCue = true;
      continue;
    }

    if (trimmed === "") {
      isInCue = false;
      continue;
    }

    if (isInCue && trimmed) {
      textLines.push(trimmed);
    }
  }

  return textLines.join("\n");
}

function detectEncoding(uint8Array: Uint8Array): string {
  if (
    uint8Array.length >= 3 &&
    uint8Array[0] === 0xef &&
    uint8Array[1] === 0xbb &&
    uint8Array[2] === 0xbf
  ) {
    return "UTF-8";
  }

  if (isValidUTF8(uint8Array)) {
    return "UTF-8";
  }

  return "Shift_JIS";
}

function isValidUTF8(uint8Array: Uint8Array): boolean {
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    decoder.decode(uint8Array);
    return true;
  } catch {
    return false;
  }
}

function detectMimeType(filename: string): string {
  return getMimeByExtension(filename);
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function createError(code: ParseError["code"], message: string): ParseError {
  return { code, message };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}
