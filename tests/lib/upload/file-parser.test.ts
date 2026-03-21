import { describe, expect, it } from "vitest";

import { parseFile, SUPPORTED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/upload/file-parser";

/**
 * Minimal valid PDF containing the text "Hello World".
 * Generated programmatically to avoid binary fixture files.
 */
function createMinimalPdf(text = "Hello World"): Uint8Array {
  const streamContent = `BT /F1 12 Tf 100 700 Td (${text}) Tj ET`;
  const streamLength = streamContent.length;

  const pdf = [
    "%PDF-1.4",
    "1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj",
    "2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj",
    `3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj`,
    `4 0 obj <</Length ${streamLength}>>`,
    "stream",
    streamContent,
    "endstream",
    "endobj",
    "5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj",
    "xref",
    "0 6",
    "0000000000 65535 f ",
    "0000000009 00000 n ",
    "0000000058 00000 n ",
    "0000000115 00000 n ",
    `0000000${(266).toString().padStart(3, "0")} 00000 n `,
    `0000000${(266 + streamLength + 44).toString().padStart(3, "0")} 00000 n `,
    "trailer <</Size 6 /Root 1 0 R>>",
    "startxref",
    "0",
    "%%EOF",
  ].join("\n");

  return new TextEncoder().encode(pdf);
}

describe("lib/upload/file-parser", () => {
  describe("SUPPORTED_MIME_TYPES", () => {
    it("application/pdf がサポートされている", () => {
      expect(SUPPORTED_MIME_TYPES).toContain("application/pdf");
    });
  });

  describe("parseFile - PDF", () => {
    it("有効な PDF からテキストを抽出できる", async () => {
      const pdfBytes = createMinimalPdf("Hello World");
      const file = new File([pdfBytes], "test.pdf", {
        type: "application/pdf",
      });

      const result = await parseFile(file);

      expect(result.filename).toBe("test.pdf");
      expect(result.text).toContain("Hello World");
      expect(result.encoding).toBe("UTF-8");
      expect(result.size).toBeGreaterThan(0);
    });

    it("MIME未指定でも拡張子で PDF と判定できる", async () => {
      const pdfBytes = createMinimalPdf("Fallback Test");
      const file = new File([pdfBytes], "document.pdf", {
        type: "",
      });

      const result = await parseFile(file);

      expect(result.text).toContain("Fallback Test");
    });

    it("空の PDF は EMPTY_FILE エラーを返す", async () => {
      const file = new File([], "empty.pdf", {
        type: "application/pdf",
      });

      await expect(parseFile(file)).rejects.toMatchObject({
        code: "EMPTY_FILE",
      });
    });

    it("壊れた PDF は PARSE_ERROR を返す", async () => {
      const garbage = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
      const file = new File([garbage], "corrupt.pdf", {
        type: "application/pdf",
      });

      await expect(parseFile(file)).rejects.toMatchObject({
        code: "PARSE_ERROR",
      });
    });

    it("サイズ超過の PDF は FILE_TOO_LARGE エラーを返す", async () => {
      const largePdf = new Uint8Array(MAX_FILE_SIZE + 1);
      const file = new File([largePdf], "large.pdf", {
        type: "application/pdf",
      });

      await expect(parseFile(file)).rejects.toMatchObject({
        code: "FILE_TOO_LARGE",
      });
    });
  });

  describe("parseFile - text formats", () => {
    it("txt ファイルを解析できる", async () => {
      const file = new File(["テスト文書です"], "test.txt", {
        type: "text/plain",
      });

      const result = await parseFile(file);
      expect(result.text).toBe("テスト文書です");
    });

    it("json ファイルを解析できる", async () => {
      const file = new File(['{"key": "value"}'], "data.json", {
        type: "application/json",
      });

      const result = await parseFile(file);
      expect(result.text).toContain('"key"');
    });
  });
});
