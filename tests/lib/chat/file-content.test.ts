import { describe, expect, it } from "vitest";

import { buildDisplayContent, buildLlmContent, isTextFile } from "@/lib/chat/file-content";

describe("lib/chat/file-content", () => {
  describe("isTextFile", () => {
    it("text/plain は true", () => {
      expect(isTextFile("text/plain")).toBe(true);
    });

    it("application/pdf は false", () => {
      expect(isTextFile("application/pdf")).toBe(false);
    });
  });

  describe("buildLlmContent", () => {
    it("text は <file> タグで content を含める", () => {
      const llm = buildLlmContent("input", [
        { name: "a.txt", type: "text/plain", size: 10, content: "hello\nworld" },
      ]);

      expect(llm).toContain(`<file name="a.txt" type="text/plain" size="10">`);
      expect(llm).toContain("hello");
      expect(llm).toContain("</file>");
    });

    it("binary(content null) はメタ情報のみを埋め込む", () => {
      const llm = buildLlmContent("input", [
        { name: "a.pdf", type: "application/pdf", size: 123, content: null },
      ]);

      expect(llm).toContain(`[添付ファイル: a.pdf (application/pdf,`);
      expect(llm).not.toContain(`<file name="a.pdf"`);
    });
  });

  describe("buildDisplayContent", () => {
    it("text はプレビューとして引用行を含める", () => {
      const display = buildDisplayContent("input", [
        { name: "a.txt", type: "text/plain", size: 10, content: "hello\nworld" },
      ]);

      expect(display).toContain("📎 a.txt");
      expect(display).toContain("> hello");
    });

    it("binary(content null) はヘッダのみになる", () => {
      const display = buildDisplayContent("input", [
        { name: "a.pdf", type: "application/pdf", size: 123, content: null },
      ]);

      expect(display).toContain("📎 a.pdf");
      // 引用行は出ない
      expect(display).not.toContain("> ");
    });
  });
});
