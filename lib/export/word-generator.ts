/**
 * Wordドキュメント生成
 * docxライブラリを使用して.docxファイルを生成
 */

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableCell,
  TableRow,
  WidthType,
  AlignmentType,
  Packer,
  BorderStyle,
} from "docx";
import { parseMarkdown } from "./markdown-parser";
import type { MarkdownElement } from "@/types/export";

export interface WordGenerationOptions {
  title?: string;
  author?: string;
}

export async function generateWordDocument(
  markdownContent: string,
  options: WordGenerationOptions = {}
): Promise<Blob> {
  const elements = parseMarkdown(markdownContent);
  const children: (Paragraph | Table)[] = [];

  // タイトル追加
  if (options.title) {
    children.push(
      new Paragraph({
        text: options.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
  }

  // Markdown要素をWord要素に変換
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];

    switch (element.type) {
      case "heading":
        children.push(
          createHeadingParagraph(element.content, element.level || 1)
        );
        break;

      case "paragraph":
        children.push(createParagraph(element.content));
        break;

      case "list":
        for (const item of element.items || []) {
          children.push(createListItem(item));
        }
        break;

      case "table":
        if (element.rows && element.rows.length > 0) {
          children.push(createTable(element.rows));
        }
        break;

      case "code":
        children.push(createCodeParagraph(element.content));
        break;
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
    creator: options.author || "AD Production AI Hub",
    title: options.title,
  });

  return await Packer.toBlob(doc);
}

function createHeadingParagraph(text: string, level: number): Paragraph {
  const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  };

  return new Paragraph({
    text,
    heading: headingMap[level] || HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
  });
}

function createParagraph(text: string): Paragraph {
  // インラインスタイル処理（**太字**、*斜体*）
  const runs: TextRun[] = [];

  // 太字(**text**)と斜体(*text*)を処理
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(
        new TextRun({
          text: part.slice(2, -2),
          bold: true,
        })
      );
    } else if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      runs.push(
        new TextRun({
          text: part.slice(1, -1),
          italics: true,
        })
      );
    } else if (part) {
      runs.push(new TextRun({ text: part }));
    }
  }

  return new Paragraph({
    children: runs.length > 0 ? runs : [new TextRun({ text })],
    spacing: { after: 120 },
  });
}

function createListItem(text: string): Paragraph {
  return new Paragraph({
    text: `・${text}`,
    spacing: { after: 60 },
    indent: { left: 720 },
  });
}

function createCodeParagraph(code: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: code,
        font: "Courier New",
        size: 20, // 10pt
      }),
    ],
    spacing: { after: 120, before: 120 },
    shading: {
      fill: "F5F5F5",
    },
  });
}

function createTable(rows: string[][]): Table {
  // ヘッダー行とデータ行を分ける
  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  const tableRows: TableRow[] = [];

  // ヘッダー行
  tableRows.push(
    new TableRow({
      children: headerRow.map((cell) => {
        return new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cell,
                  bold: true,
                }),
              ],
            }),
          ],
          width: { type: WidthType.AUTO, size: 0 },
          shading: {
            fill: "E8E8E8",
          },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          },
        });
      }),
    })
  );

  // データ行
  for (const row of dataRows) {
    tableRows.push(
      new TableRow({
        children: row.map((cell) => {
          return new TableCell({
            children: [new Paragraph({ text: cell })],
            width: { type: WidthType.AUTO, size: 0 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            },
          });
        }),
      })
    );
  }

  return new Table({
    rows: tableRows,
    width: { type: WidthType.PERCENTAGE, size: 100 },
  });
}
