/**
 * Wordジェネレーターのテスト
 */

import { describe, expect, it } from "vitest";
import { parseMarkdown } from "@/lib/export/markdown-parser";
import { generateWordDocument } from "@/lib/export/word-generator";

describe("Markdown Parser", () => {
  it("見出しをパースできる", () => {
    const content = "# Heading 1\n## Heading 2";
    const elements = parseMarkdown(content);

    expect(elements).toHaveLength(2);
    expect(elements[0]).toEqual({
      type: "heading",
      level: 1,
      content: "Heading 1",
    });
    expect(elements[1]).toEqual({
      type: "heading",
      level: 2,
      content: "Heading 2",
    });
  });

  it("段落をパースできる", () => {
    const content = "This is a paragraph.\nWith multiple lines.";
    const elements = parseMarkdown(content);

    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe("paragraph");
    expect(elements[0].content).toBe("This is a paragraph. With multiple lines.");
  });

  it("リストをパースできる", () => {
    const content = "- Item 1\n- Item 2\n- Item 3";
    const elements = parseMarkdown(content);

    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe("list");
    expect(elements[0].items).toEqual(["Item 1", "Item 2", "Item 3"]);
  });

  it("テーブルをパースできる", () => {
    const content = "| Col1 | Col2 |\n|------|------|\n| A    | B    |";
    const elements = parseMarkdown(content);

    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe("table");
    expect(elements[0].rows).toEqual([
      ["Col1", "Col2"],
      ["A", "B"],
    ]);
  });
});

describe("Word Document Generator", () => {
  it("Wordドキュメントを生成できる", async () => {
    const markdown = "# Test Document\n\nThis is a test.";
    const blob = await generateWordDocument(markdown, {
      title: "Test",
      author: "Test Author",
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(blob.size).toBeGreaterThan(0);
  });

  it("タイトルなしで生成できる", async () => {
    const markdown = "## Heading\n\nContent here.";
    const blob = await generateWordDocument(markdown);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});
