/**
 * Markdownパーサー
 * Markdownテキストを構造化データに変換
 */

import type { MarkdownElement } from "@/types/export";

export function parseMarkdown(content: string): MarkdownElement[] {
  const elements: MarkdownElement[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 見出し判定
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      elements.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // テーブル判定
    if (line.startsWith("|")) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const row = lines[i]
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim());
        // セパレータ行をスキップ (---|---|---)
        if (!row.every((cell) => cell.match(/^[-:]+$/))) {
          tableRows.push(row);
        }
        i++;
      }
      if (tableRows.length > 0) {
        elements.push({
          type: "table",
          content: "",
          rows: tableRows,
        });
      }
      continue;
    }

    // リスト判定
    const listMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (listMatch) {
      const items: string[] = [];
      const baseIndent = listMatch[1].length;

      while (i < lines.length) {
        const currentLine = lines[i];
        const currentMatch = currentLine.match(/^(\s*)[-*+]\s+(.+)$/);
        if (!currentMatch) break;
        items.push(currentMatch[2].trim());
        i++;
      }

      if (items.length > 0) {
        elements.push({
          type: "list",
          content: "",
          items,
        });
      }
      continue;
    }

    // コードブロック判定
    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push({
        type: "code",
        content: codeLines.join("\n"),
        language,
      });
      i++;
      continue;
    }

    // 空行はスキップ
    if (!line.trim()) {
      i++;
      continue;
    }

    // 段落（連続する行を1つの段落としてまとめる）
    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].match(/^[#|\-*+]/)) {
      paragraphLines.push(lines[i].trim());
      i++;
    }

    if (paragraphLines.length > 0) {
      elements.push({
        type: "paragraph",
        content: paragraphLines.join(" "),
      });
    }
  }

  return elements;
}
