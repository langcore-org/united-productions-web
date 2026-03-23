import { describe, expect, it } from "vitest";

import {
  buildDisplayContent,
  buildLlmContent,
  isTextFile,
  processFile,
} from "@/lib/chat/file-content";

describe("lib/chat/file-content", () => {
  describe("isTextFile", () => {
    it("text/plain は true", () => {
      expect(isTextFile("text/plain")).toBe(true);
    });

    it("text/vtt は true", () => {
      expect(isTextFile("text/vtt")).toBe(true);
    });

    it("text/markdown は true", () => {
      expect(isTextFile("text/markdown")).toBe(true);
    });

    it("application/json は true", () => {
      expect(isTextFile("application/json")).toBe(true);
    });

    it("application/pdf は false", () => {
      expect(isTextFile("application/pdf")).toBe(false);
    });
  });

  describe("processFile", () => {
    it("text ファイルは content を読み込む", async () => {
      const file = new File(["hello world"], "a.txt", { type: "text/plain" });
      const parsed = await processFile(file);

      expect(parsed.name).toBe("a.txt");
      expect(parsed.content).toContain("hello world");
    });

    it("binary ファイルは content:null", async () => {
      const file = new File([new Uint8Array([1, 2, 3])], "a.pdf", { type: "application/pdf" });
      const parsed = await processFile(file);

      expect(parsed.name).toBe("a.pdf");
      expect(parsed.content).toBeNull();
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
      expect(display).not.toContain("> ");
    });
  });
});
