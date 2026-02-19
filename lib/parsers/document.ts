/**
 * ドキュメントファイルパーサー
 * 
 * PDF、Word、Excelファイルからテキストを抽出します。
 * サーバーサイドでのみ実行されます。
 */

export interface ParsedDocument {
  text: string;
  fileType: string;
  fileName: string;
  metadata?: {
    pageCount?: number;
    author?: string;
    createdAt?: Date;
  };
}

/**
 * PDFファイルからテキストを抽出
 * サーバーサイドでのみ実行
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
  try {
    // pdf-parseは動的インポート（サーバーサイドのみ）
    // @ts-expect-error pdf-parse may not be installed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParse: any = await import("pdf-parse");
    const result = await pdfParse.default(buffer);
    
    return {
      text: result.text,
      fileType: "application/pdf",
      fileName: "",
      metadata: {
        pageCount: result.numpages,
        author: result.info?.Author,
      },
    };
  } catch (error) {
    console.error("PDF parse error:", error);
    throw new Error("PDFファイルの解析に失敗しました");
  }
}

/**
 * Wordファイルからテキストを抽出
 * サーバーサイドでのみ実行
 */
export async function parseWord(buffer: Buffer): Promise<ParsedDocument> {
  try {
    // mammothを使用してWordファイルを解析
    // @ts-expect-error mammoth may not be installed
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    
    return {
      text: result.value,
      fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileName: "",
      metadata: {},
    };
  } catch (error) {
    console.error("Word parse error:", error);
    throw new Error("Wordファイルの解析に失敗しました");
  }
}

/**
 * Excelファイルからテキストを抽出
 * サーバーサイドでのみ実行
 */
export async function parseExcel(buffer: Buffer): Promise<ParsedDocument> {
  try {
    // xlsxを使用してExcelファイルを解析
    // @ts-expect-error xlsx may not be installed
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    
    // 全シートのテキストを結合
    let text = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workbook.SheetNames.forEach((sheetName: any) => {
      const sheet = workbook.Sheets[sheetName];
      const sheetText = XLSX.utils.sheet_to_csv(sheet);
      text += `\n--- ${sheetName} ---\n${sheetText}`;
    });
    
    return {
      text: text.trim(),
      fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileName: "",
      metadata: {
        pageCount: workbook.SheetNames.length,
      },
    };
  } catch (error) {
    console.error("Excel parse error:", error);
    throw new Error("Excelファイルの解析に失敗しました");
  }
}

/**
 * ファイルタイプを判定
 */
export function detectFileType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "docx":
    case "doc":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xlsx":
    case "xls":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "csv":
      return "text/csv";
    case "txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

/**
 * ファイルをパース
 */
export async function parseDocument(
  buffer: Buffer,
  fileName: string
): Promise<ParsedDocument> {
  const fileType = detectFileType(fileName);
  
  let result: ParsedDocument;
  
  switch (fileType) {
    case "application/pdf":
      result = await parsePDF(buffer);
      break;
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      result = await parseWord(buffer);
      break;
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      result = await parseExcel(buffer);
      break;
    case "text/csv":
    case "text/plain":
      result = {
        text: buffer.toString("utf-8"),
        fileType,
        fileName,
      };
      break;
    default:
      throw new Error(`未対応のファイル形式です: ${fileType}`);
  }
  
  result.fileName = fileName;
  return result;
}

/**
 * テキストからスケジュールデータを抽出するためのプロンプトを生成
 */
export function generateScheduleExtractionPrompt(text: string): string {
  return `以下のマスタースケジュールから、スケジュール表を構造化してください。

【入力テキスト】
${text}

【出力形式】
以下のJSON形式で出力してください：

{\n  "title": "スケジュール名",\n  "dates": ["YYYY-MM-DD", ...],\n  "locations": ["場所1", "場所2", ...],\n  "participants": ["参加者1", "参加者2", ...],\n  "schedule": [\n    {\n      "date": "YYYY-MM-DD",\n      "time": "HH:MM",\n      "endTime": "HH:MM",\n      "location": "場所名",\n      "activity": "活動内容",\n      "participants": ["参加者1", ...],\n      "notes": "備考"\n    }\n  ]\n}

【注意事項】
- 日付はYYYY-MM-DD形式で統一
- 時間は24時間制（HH:MM）で統一
- 不明な情報は空文字または空配列
- 重複を排除して整理`;
}
