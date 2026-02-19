/**
 * Word出力関連の型定義
 */

export interface WordExportRequest {
  content: string; // Markdown形式のコンテンツ
  filename?: string; // 出力ファイル名（拡張子なし）
  title?: string; // 文書タイトル
}

export interface WordExportResponse {
  success: boolean;
  data?: {
    blob: Blob;
    filename: string;
  };
  error?: string;
}

export interface MarkdownElement {
  type: "heading" | "paragraph" | "list" | "table" | "code";
  level?: number; // headingの場合
  content: string;
  items?: string[]; // listの場合
  rows?: string[][]; // tableの場合
  language?: string; // codeの場合
}
