# AD Production AI Hub - 詳細実装タスク（完全版）

**作成日**: 2026年2月19日  
**対象期間**: 3月末リリース（4週間）  
**文書バージョン**: 1.0

---

## 目次
1. [アーキテクチャ概要](#1-アーキテクチャ概要)
2. [Week 1: Word出力 & ファイルアップロード](#2-week-1-word出力--ファイルアップロード)
3. [Week 2: リサーチ機能実装](#3-week-2-リサーチ機能実装)
4. [Week 3: 新企画立案 & UI整備](#4-week-3-新企画立案--ui整備)
5. [Week 4: 最終調整 & リリース](#5-week-4-最終調整--リリース)
6. [技術仕様詳細](#6-技術仕様詳細)

---

## 1. アーキテクチャ概要

### 1.1 システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                         クライアント層                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │議事録作成 │ │NA原稿作成│ │リサーチ  │ │新企画立案│           │
│  │  Page    │ │  Page    │ │  Page    │ │  Page    │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │            │            │            │                  │
│  ┌────┴────────────┴────────────┴────────────┘                  │
│  │              FeatureChat.tsx                                 │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │  │WordExport│ │FileUpload│ │ useLLM   │                     │
│  │  │ Button   │ │          │ │ Stream   │                     │
│  │  └──────────┘ └──────────┘ └──────────┘                     │
│  └─────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         APIルート層                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │/api/meeting- │ │/api/transcript│ │/api/research │            │
│  │   notes      │ │     s        │ │              │            │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘            │
│  ┌──────┴───────┐ ┌──────┴───────┐ ┌──────┴───────┐            │
│  │/api/export/  │ │/api/upload   │ │/api/proposal │            │
│  │   word       │ │              │ │              │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      サービス層 (lib/)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │GrokClient    │ │getPromptFrom │ │   docx       │            │
│  │              │ │     DB       │ │  library     │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │mammoth       │ │ resolveProvi │ │ createApi    │            │
│  │ (docx解析)   │ │    der       │ │   Handler    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      データ層                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐                            │
│  │  PostgreSQL  │ │   xAI API    │                            │
│  │  (Prisma)    │ │   (Grok)     │                            │
│  └──────────────┘ └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 データフロー

```
[ユーザー入力] → [バリデーション] → [プロンプト取得(DB)] → [LLM API] → [レスポンス整形] → [表示/出力]
      │               │                    │                    │              │           │
      ▼               ▼                    ▼                    ▼              ▼           ▼
   Text/         Zod Schema         SystemPrompt          GrokClient        Markdown    Word/
   File          検証               テーブル              xAI API           テキスト     Download
```

---

## 2. Week 1: Word出力 & ファイルアップロード

### 2.1 Day 1: 環境構築 & npmパッケージインストール

#### タスク 1.1.1: 必要パッケージのインストール

```bash
# Word出力用
npm install docx file-saver
npm install -D @types/file-saver

# ファイルアップロード解析用
npm install mammoth                    # docx解析
npm install iconv-lite                 # 文字コード変換
npm install -D @types/iconv-lite

# バリデーション強化
npm install zod-form-data              # FormData用Zodスキーマ
```

**package.jsonへの追加確認**:
```json
{
  "dependencies": {
    "docx": "^9.0.0",
    "file-saver": "^2.0.5",
    "mammoth": "^1.6.0",
    "iconv-lite": "^0.6.3",
    "zod-form-data": "^2.0.2"
  }
}
```

#### タスク 1.1.2: 型定義ファイル作成

**ファイル**: `types/export.ts` (新規)

```typescript
/**
 * Word出力関連の型定義
 */

export interface WordExportRequest {
  content: string;           // Markdown形式のコンテンツ
  filename?: string;         // 出力ファイル名（拡張子なし）
  title?: string;            // 文書タイトル
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
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'code';
  level?: number;            // headingの場合
  content: string;
  items?: string[];          // listの場合
  rows?: string[][];         // tableの場合
  language?: string;         // codeの場合
}
```

**ファイル**: `types/upload.ts` (新規)

```typescript
/**
 * ファイルアップロード関連の型定義
 */

export type SupportedFileType = 'text/plain' | 'text/vtt' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const SUPPORTED_FILE_EXTENSIONS = ['.txt', '.vtt', '.docx'] as const;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface FileUploadRequest {
  file: File;
}

export interface FileUploadResponse {
  success: boolean;
  data?: {
    text: string;
    filename: string;
    size: number;
  };
  error?: string;
}

export interface FileValidationError {
  code: 'FILE_TOO_LARGE' | 'UNSUPPORTED_TYPE' | 'EMPTY_FILE' | 'ENCODING_ERROR';
  message: string;
}
```

#### タスク 1.1.3: ユーティリティ関数作成

**ファイル**: `lib/export/markdown-parser.ts` (新規)

```typescript
/**
 * Markdownパーサー
 * Markdownテキストを構造化データに変換
 */

import type { MarkdownElement } from '@/types/export';

export function parseMarkdown(content: string): MarkdownElement[] {
  const elements: MarkdownElement[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 見出し判定
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      elements.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // テーブル判定
    if (line.startsWith('|')) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const row = lines[i]
          .split('|')
          .slice(1, -1)
          .map(cell => cell.trim());
        if (!row.every(cell => cell.match(/^[-:]+$/))) {
          tableRows.push(row);
        }
        i++;
      }
      if (tableRows.length > 0) {
        elements.push({
          type: 'table',
          content: '',
          rows: tableRows,
        });
      }
      continue;
    }

    // リスト判定
    const listMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (listMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const currentLine = lines[i];
        const currentMatch = currentLine.match(/^(\s*)[-*+]\s+(.+)$/);
        if (!currentMatch) break;
        items.push(currentMatch[2].trim());
        i++;
      }
      elements.push({
        type: 'list',
        content: '',
        items,
      });
      continue;
    }

    // コードブロック判定
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push({
        type: 'code',
        content: codeLines.join('\n'),
        language,
      });
      i++;
      continue;
    }

    // 段落
    if (line.trim()) {
      elements.push({
        type: 'paragraph',
        content: line.trim(),
      });
    }

    i++;
  }

  return elements;
}
```

---

### 2.2 Day 2: Word出力API実装

#### タスク 1.2.1: Wordドキュメント生成ユーティリティ

**ファイル**: `lib/export/word-generator.ts` (新規)

```typescript
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
} from 'docx';
import { parseMarkdown } from './markdown-parser';
import type { MarkdownElement } from '@/types/export';

export interface WordGenerationOptions {
  title?: string;
  author?: string;
}

export async function generateWordDocument(
  markdownContent: string,
  options: WordGenerationOptions = {}
): Promise<Blob> {
  const elements = parseMarkdown(markdownContent);
  const children: Paragraph[] = [];

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
  for (const element of elements) {
    switch (element.type) {
      case 'heading':
        children.push(createHeadingParagraph(element.content, element.level || 1));
        break;

      case 'paragraph':
        children.push(createParagraph(element.content));
        break;

      case 'list':
        for (const item of element.items || []) {
          children.push(createListItem(item));
        }
        break;

      case 'table':
        // テーブルは別処理
        break;

      case 'code':
        children.push(createCodeParagraph(element.content));
        break;
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
    creator: options.author || 'AD Production AI Hub',
    title: options.title,
  });

  return await Packer.toBlob(doc);
}

function createHeadingParagraph(text: string, level: number): Paragraph {
  const headingMap: Record<number, HeadingLevel> = {
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
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({
        text: part.slice(2, -2),
        bold: true,
      }));
    } else if (part.startsWith('*') && part.endsWith('*')) {
      runs.push(new TextRun({
        text: part.slice(1, -1),
        italics: true,
      }));
    } else {
      runs.push(new TextRun({ text: part }));
    }
  }

  return new Paragraph({
    children: runs,
    spacing: { after: 120 },
  });
}

function createListItem(text: string): Paragraph {
  return new Paragraph({
    text: `• ${text}`,
    spacing: { after: 60 },
    indent: { left: 720 },
  });
}

function createCodeParagraph(code: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: code,
        font: 'Courier New',
        size: 20, // 10pt
      }),
    ],
    spacing: { after: 120 },
    shading: {
      fill: 'F5F5F5',
    },
  });
}

function createTable(rows: string[][]): Table {
  const tableRows = rows.map((row, rowIndex) => {
    return new TableRow({
      children: row.map(cell => {
        return new TableCell({
          children: [new Paragraph({ text: cell })],
          width: { type: WidthType.AUTO },
        });
      }),
    });
  });

  return new Table({
    rows: tableRows,
    width: { type: WidthType.PERCENTAGE, size: 100 },
  });
}
```

#### タスク 1.2.2: Word出力APIエンドポイント

**ファイル**: `app/api/export/word/route.ts` (新規)

```typescript
/**
 * Word出力API
 * 
 * POST /api/export/word
 * MarkdownコンテンツをWord(.docx)に変換して返却
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateWordDocument } from '@/lib/export/word-generator';
import { createApiHandler } from '@/lib/api/handler';

// リクエストスキーマ
const wordExportSchema = z.object({
  content: z.string().min(1, 'コンテンツを入力してください'),
  filename: z.string().optional(),
  title: z.string().optional(),
});

export type WordExportRequest = z.infer<typeof wordExportSchema>;

/**
 * POST /api/export/word
 * 
 * Request Body:
 * {
 *   "content": "# 見出し\n\n本文テキスト",
 *   "filename": "議事録_20240219",
 *   "title": "議事録"
 * }
 * 
 * Response:
 * - Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
 * - Content-Disposition: attachment; filename="議事録_20240219.docx"
 */
export const POST = createApiHandler(
  async ({ data }) => {
    const { content, filename, title } = data;

    // Wordドキュメント生成
    const blob = await generateWordDocument(content, {
      title,
      author: 'AD Production AI Hub',
    });

    // ArrayBufferに変換
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ファイル名設定
    const outputFilename = filename 
      ? `${filename}.docx` 
      : `document_${new Date().toISOString().split('T')[0]}.docx`;

    // レスポンス返却
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(outputFilename)}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  },
  { 
    schema: wordExportSchema,
    requireAuth: true,
  }
);

// エラーハンドリング
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

#### タスク 1.2.3: Word出力用カスタムフック

**ファイル**: `hooks/useWordExport.ts` (新規)

```typescript
/**
 * Word出力カスタムフック
 */

import { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';

interface UseWordExportOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseWordExportReturn {
  exportToWord: (content: string, filename?: string, title?: string) => Promise<void>;
  isExporting: boolean;
  error: Error | null;
}

export function useWordExport(options: UseWordExportOptions = {}): UseWordExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportToWord = useCallback(async (
    content: string,
    filename?: string,
    title?: string
  ): Promise<void> => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch('/api/export/word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          filename,
          title,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Word出力に失敗しました (${response.status})`);
      }

      // ファイル名取得
      const contentDisposition = response.headers.get('Content-Disposition');
      const match = contentDisposition?.match(/filename="?([^"]+)"?/);
      const downloadFilename = match?.[1] || 'document.docx';

      // Blobとして保存
      const blob = await response.blob();
      saveAs(blob, decodeURIComponent(downloadFilename));

      options.onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Word出力に失敗しました');
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [options]);

  return {
    exportToWord,
    isExporting,
    error,
  };
}
```

#### タスク 1.2.4: Word出力ボタンコンポーネント

**ファイル**: `components/ui/WordExportButton.tsx` (新規)

```typescript
/**
 * Word出力ボタンコンポーネント
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useWordExport } from '@/hooks/useWordExport';
import { FileText, Loader2, Check, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface WordExportButtonProps {
  content: string;
  filename?: string;
  title?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
}

export function WordExportButton({
  content,
  filename,
  title,
  variant = 'outline',
  size = 'sm',
  disabled = false,
}: WordExportButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { exportToWord, isExporting } = useWordExport({
    onSuccess: () => {
      setShowSuccess(true);
      toast.success('Wordファイルをダウンロードしました');
      setTimeout(() => setShowSuccess(false), 2000);
    },
    onError: (error) => {
      toast.error(`Word出力エラー: ${error.message}`);
    },
  });

  const handleClick = async () => {
    if (!content.trim()) {
      toast.error('出力するコンテンツがありません');
      return;
    }
    await exportToWord(content, filename, title);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            disabled={disabled || isExporting || !content.trim()}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : showSuccess ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">
              {isExporting ? '出力中...' : 'Wordで保存'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Wordファイル(.docx)としてダウンロード</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

---

### 2.3 Day 3-4: ファイルアップロード機能実装

#### タスク 1.3.1: ファイル解析ユーティリティ

**ファイル**: `lib/upload/file-parser.ts` (新規)

```typescript
/**
 * ファイル解析ユーティリティ
 * 各種ファイル形式からテキストを抽出
 */

import * as iconv from 'iconv-lite';
import * as mammoth from 'mammoth';

export interface ParsedFile {
  text: string;
  filename: string;
  size: number;
  encoding: string;
}

export interface ParseError {
  code: 'FILE_TOO_LARGE' | 'UNSUPPORTED_TYPE' | 'EMPTY_FILE' | 'ENCODING_ERROR' | 'PARSE_ERROR';
  message: string;
}

// サポートされるMIMEタイプ
export const SUPPORTED_MIME_TYPES = [
  'text/plain',
  'text/vtt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// 最大ファイルサイズ (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * ファイルを解析してテキストを抽出
 */
export async function parseFile(
  file: File,
  options: { maxSize?: number } = {}
): Promise<ParsedFile> {
  const maxSize = options.maxSize || MAX_FILE_SIZE;

  // ファイルサイズチェック
  if (file.size > maxSize) {
    throw createError('FILE_TOO_LARGE', `ファイルサイズは${formatBytes(maxSize)}以下にしてください`);
  }

  // 空ファイルチェック
  if (file.size === 0) {
    throw createError('EMPTY_FILE', 'ファイルが空です');
  }

  // MIMEタイプ判定
  const mimeType = file.type || detectMimeType(file.name);

  switch (mimeType) {
    case 'text/plain':
      return parseTextFile(file);

    case 'text/vtt':
      return parseVTTFile(file);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseDocxFile(file);

    default:
      // 拡張子で判定を試みる
      if (file.name.endsWith('.txt')) {
        return parseTextFile(file);
      } else if (file.name.endsWith('.vtt')) {
        return parseVTTFile(file);
      } else if (file.name.endsWith('.docx')) {
        return parseDocxFile(file);
      }
      
      throw createError('UNSUPPORTED_TYPE', 'サポートされていないファイル形式です (.txt, .vtt, .docx)');
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
    
    if (encoding === 'UTF-8') {
      text = new TextDecoder('utf-8').decode(uint8Array);
    } else {
      text = iconv.decode(Buffer.from(uint8Array), encoding);
    }

    return {
      text: normalizeText(text),
      filename: file.name,
      size: file.size,
      encoding,
    };
  } catch (error) {
    throw createError('ENCODING_ERROR', '文字コードの変換に失敗しました');
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
    
    if (encoding === 'UTF-8') {
      text = new TextDecoder('utf-8').decode(uint8Array);
    } else {
      text = iconv.decode(Buffer.from(uint8Array), encoding);
    }

    // VTTフォーマットからテキストを抽出
    const extractedText = extractVTTText(text);

    return {
      text: extractedText,
      filename: file.name,
      size: file.size,
      encoding,
    };
  } catch (error) {
    throw createError('PARSE_ERROR', 'VTTファイルの解析に失敗しました');
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
      encoding: 'UTF-8',
    };
  } catch (error) {
    throw createError('PARSE_ERROR', 'Wordファイルの解析に失敗しました');
  }
}

/**
 * VTTテキストから字幕テキストを抽出
 */
function extractVTTText(vttContent: string): string {
  const lines = vttContent.split('\n');
  const textLines: string[] = [];
  let isInCue = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // WEBVTTヘッダーをスキップ
    if (trimmed === 'WEBVTT') continue;
    
    // タイムスタンプ行をスキップ (00:00:00.000 --> 00:00:00.000)
    if (trimmed.match(/^\d{2}:\d{2}:\d{2}\.\d{3}/)) {
      isInCue = true;
      continue;
    }
    
    // 空行でキュー終了
    if (trimmed === '') {
      isInCue = false;
      continue;
    }
    
    // キュー内のテキストを抽出
    if (isInCue && trimmed) {
      textLines.push(trimmed);
    }
  }

  return textLines.join('\n');
}

/**
 * 文字コード判定
 */
function detectEncoding(uint8Array: Uint8Array): string {
  // BOMチェック
  if (uint8Array.length >= 3 && 
      uint8Array[0] === 0xEF && 
      uint8Array[1] === 0xBB && 
      uint8Array[2] === 0xBF) {
    return 'UTF-8';
  }

  // UTF-8の妥当性チェック
  if (isValidUTF8(uint8Array)) {
    return 'UTF-8';
  }

  // Shift_JISと仮定
  return 'Shift_JIS';
}

/**
 * UTF-8妥当性チェック
 */
function isValidUTF8(uint8Array: Uint8Array): boolean {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
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
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'txt':
      return 'text/plain';
    case 'vtt':
      return 'text/vtt';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream';
  }
}

/**
 * テキスト正規化
 */
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')   // Windows改行を統一
    .replace(/\r/g, '\n')     // Mac改行を統一
    .replace(/\n{3,}/g, '\n\n')  // 連続改行を2つに制限
    .trim();
}

/**
 * エラーオブジェクト作成
 */
function createError(code: ParseError['code'], message: string): ParseError {
  return { code, message };
}

/**
 * バイト数を人間可読形式に変換
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
```

#### タスク 1.3.2: ファイルアップロードAPI

**ファイル**: `app/api/upload/route.ts` (新規)

```typescript
/**
 * ファイルアップロードAPI
 * 
 * POST /api/upload
 * 各種ファイルからテキストを抽出
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseFile, MAX_FILE_SIZE } from '@/lib/upload/file-parser';
import { createApiHandler } from '@/lib/api/handler';

// リクエストスキーマ（FormData用）
const uploadSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.size <= MAX_FILE_SIZE,
    `ファイルサイズは${formatBytes(MAX_FILE_SIZE)}以下にしてください`
  ),
});

/**
 * POST /api/upload
 * 
 * Request:
 * - Content-Type: multipart/form-data
 * - Body: file (File)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "text": "抽出されたテキスト",
 *     "filename": "document.txt",
 *     "size": 1024
 *   }
 * }
 */
export const POST = async (request: NextRequest) => {
  try {
    // FormDataをパース
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルが見つかりません' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          success: false, 
          error: `ファイルサイズは${formatBytes(MAX_FILE_SIZE)}以下にしてください`,
          code: 'FILE_TOO_LARGE'
        },
        { status: 413 }
      );
    }

    // ファイル解析
    const parsed = await parseFile(file);

    return NextResponse.json({
      success: true,
      data: {
        text: parsed.text,
        filename: parsed.filename,
        size: parsed.size,
      },
    });

  } catch (error) {
    console.error('File upload error:', error);
    
    if (error && typeof error === 'object' && 'code' in error) {
      const parseError = error as { code: string; message: string };
      return NextResponse.json(
        { success: false, error: parseError.message, code: parseError.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'ファイルの処理に失敗しました' },
      { status: 500 }
    );
  }
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 最大ボディサイズ設定
export const maxBodyLength = 11 * 1024 * 1024; // 11MB (少し余裕を持たせる)
```

#### タスク 1.3.3: ファイルアップロードフック

**ファイル**: `hooks/useFileUpload.ts` (新規)

```typescript
/**
 * ファイルアップロードカスタムフック
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseFileUploadOptions {
  onSuccess?: (text: string, filename: string) => void;
  onError?: (error: Error) => void;
}

interface UseFileUploadReturn {
  uploadFile: (file: File) => Promise<string | null>;
  isUploading: boolean;
  progress: number;
  error: Error | null;
  reset: () => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'ファイルのアップロードに失敗しました';
        throw new Error(errorMessage);
      }

      setProgress(100);
      options.onSuccess?.(result.data.text, result.data.filename);
      toast.success(`${result.data.filename} を読み込みました`);
      
      return result.data.text;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('ファイルのアップロードに失敗しました');
      setError(error);
      options.onError?.(error);
      toast.error(`アップロードエラー: ${error.message}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    uploadFile,
    isUploading,
    progress,
    error,
    reset,
  };
}
```

#### タスク 1.3.4: ファイルアップロードコンポーネント

**ファイル**: `components/ui/FileUpload.tsx` (新規)

```typescript
/**
 * ファイルアップロードコンポーネント
 * ドラッグ&ドロップ対応
 */

'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFileUpload } from '@/hooks/useFileUpload';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onUpload: (text: string, filename: string) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  className?: string;
}

const DEFAULT_ACCEPT = {
  'text/plain': ['.txt'],
  'text/vtt': ['.vtt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

export function FileUpload({
  onUpload,
  accept = DEFAULT_ACCEPT,
  maxSize = 10 * 1024 * 1024, // 10MB
  className,
}: FileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const { uploadFile, isUploading, progress, reset } = useFileUpload({
    onSuccess: (text, filename) => {
      onUpload(text, filename);
    },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    await uploadFile(file);
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleClear = () => {
    setUploadedFile(null);
    reset();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // エラーメッセージ生成
  const getErrorMessage = () => {
    if (fileRejections.length === 0) return null;
    
    const rejection = fileRejections[0];
    const error = rejection.errors[0];
    
    if (error.code === 'file-too-large') {
      return `ファイルサイズは${formatFileSize(maxSize)}以下にしてください`;
    }
    if (error.code === 'file-invalid-type') {
      return '対応していないファイル形式です (.txt, .vtt, .docx)';
    }
    return error.message;
  };

  const errorMessage = getErrorMessage();

  return (
    <div className={cn('space-y-4', className)}>
      {/* アップロードエリア */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          isUploading && 'opacity-50 cursor-not-allowed',
          errorMessage && 'border-destructive',
          !isDragActive && !errorMessage && 'border-muted-foreground/25 hover:border-muted-foreground/50'
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
          ) : isDragActive ? (
            <Upload className="h-10 w-10 text-primary" />
          ) : (
            <File className="h-10 w-10 text-muted-foreground" />
          )}
          
          <div className="text-sm">
            {isDragActive ? (
              <p className="text-primary font-medium">ここにファイルをドロップ</p>
            ) : isUploading ? (
              <p className="text-muted-foreground">アップロード中...</p>
            ) : (
              <>
                <p className="font-medium">
                  クリックまたはドラッグ&ドロップでファイルをアップロード
                </p>
                <p className="text-muted-foreground mt-1">
                  対応形式: .txt, .vtt, .docx (最大 {formatFileSize(maxSize)})
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* エラーメッセージ */}
      {errorMessage && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <X className="h-4 w-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* アップロード済みファイル表示 */}
      {uploadedFile && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <File className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploadedFile.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* プログレスバー */}
          {isUploading && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {progress}%
              </p>
            </div>
          )}

          {/* 完了表示 */}
          {!isUploading && progress === 100 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="h-4 w-4" />
              <span>読み込み完了</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### 2.4 Day 5: 統合 & 既存コンポーネント改修

#### タスク 1.4.1: FeatureChatコンポーネント改修

**ファイル**: `components/ui/FeatureChat.tsx` (既存改修)

変更点をdiff形式で記載:

```typescript
// 1. インポート追加
import { WordExportButton } from './WordExportButton';
import { FileUpload } from './FileUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// 2. プロパティ追加
interface FeatureChatProps {
  gemId: GemId;
  // ... 既存プロパティ
  enableFileUpload?: boolean;  // 新規
}

// 3. コンポーネント内部に追加
export function FeatureChat({ 
  gemId, 
  enableFileUpload = false,  // デフォルトは無効
  ...props 
}: FeatureChatProps) {
  
  // ... 既存コード

  // ファイルアップロードハンドラー
  const handleFileUpload = (text: string, filename: string) => {
    setInput(text);
    toast.success(`${filename} を読み込みました`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ... 既存ヘッダー */}

      {/* 出力アクション */}
      {messages.length > 0 && (
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-b">
          <WordExportButton
            content={messages
              .filter(m => m.role === 'assistant')
              .map(m => m.content)
              .join('\n\n')}
            filename={`${gem.name}_${new Date().toISOString().split('T')[0]}`}
            title={gem.name}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="ml-2">{copied ? 'コピー完了' : 'コピー'}</span>
          </Button>
        </div>
      )}

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ... 既存メッセージ表示 */}
      </div>

      {/* 入力エリア */}
      <div className="p-4 border-t">
        {enableFileUpload && (
          <Tabs defaultValue="input" className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="input">テキスト入力</TabsTrigger>
              <TabsTrigger value="file">ファイルアップロード</TabsTrigger>
            </TabsList>
            <TabsContent value="file">
              <FileUpload onUpload={handleFileUpload} />
            </TabsContent>
          </Tabs>
        )}
        
        {/* ... 既存入力フォーム */}
      </div>
    </div>
  );
}
```

#### タスク 1.4.2: 議事録作成ページ改修

**ファイル**: `app/(authenticated)/meeting-notes/page.tsx` (既存改修)

```typescript
// FileUpload統合
// 文字起こしテキスト入力欄にファイルアップロード機能を追加

import { FileUpload } from '@/components/ui/FileUpload';

// コンポーネント内
const handleFileUpload = (text: string, filename: string) => {
  setTranscript(text);
  toast.success(`${filename} を読み込みました`);
};

// JSXに追加
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <Label>文字起こしテキスト</Label>
    <span className="text-xs text-muted-foreground">
      Zoomの文字起こしファイル(.vtt)をアップロードできます
    </span>
  </div>
  
  <FileUpload 
    onUpload={handleFileUpload}
    accept={{
      'text/plain': ['.txt'],
      'text/vtt': ['.vtt'],
    }}
  />
  
  <Textarea
    value={transcript}
    onChange={(e) => setTranscript(e.target.value)}
    placeholder="またはここに直接貼り付け..."
    rows={10}
  />
</div>
```

#### タスク 1.4.3: NA原稿作成ページ改修

**ファイル**: `app/(authenticated)/transcripts/page.tsx` (既存改修)

```typescript
// 同様にファイルアップロードを追加
// Premiere Pro書き起こしテキスト(.txt, .docx)に対応
```

---

## 3. Week 2: リサーチ機能実装

### 3.1 Day 1-2: リサーチAPI基盤

#### タスク 2.1.1: リサーチサービス層

**ファイル**: `lib/research/service.ts` (新規)

```typescript
/**
 * リサーチサービス層
 * 各種リサーチタイプの共通処理
 */

import { GrokClient } from '@/lib/llm/clients/grok';
import { getPromptFromDB, PROMPT_KEYS } from '@/lib/prompts/db';
import type { LLMMessage } from '@/lib/llm/types';
import { resolveProvider } from '@/lib/llm/utils';

export type ResearchType = 'cast' | 'location' | 'info' | 'evidence';

export interface ResearchRequest {
  type: ResearchType;
  query: string;
  options?: {
    includeX?: boolean;
    includeWeb?: boolean;
    maxResults?: number;
  };
}

export interface ResearchResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  } | null;
  sources?: string[];
}

// リサーチタイプ別のプロンプトキー
const RESEARCH_PROMPT_KEYS: Record<ResearchType, string> = {
  cast: PROMPT_KEYS.RESEARCH_CAST,
  location: PROMPT_KEYS.RESEARCH_LOCATION,
  info: PROMPT_KEYS.RESEARCH_INFO,
  evidence: PROMPT_KEYS.RESEARCH_EVIDENCE,
};

// リサーチタイプ別のPJコード
const RESEARCH_PROJECT_CODES: Record<ResearchType, string> = {
  cast: 'PJ-C-people',
  location: 'PJ-C-location',
  info: 'PJ-C-info',
  evidence: 'PJ-C-evidence',
};

/**
 * リサーチを実行
 */
export async function executeResearch(
  request: ResearchRequest
): Promise<ResearchResponse> {
  const { type, query, options = {} } = request;

  // プロンプト取得
  const promptKey = RESEARCH_PROMPT_KEYS[type];
  const systemPrompt = await getPromptFromDB(promptKey);
  
  if (!systemPrompt) {
    throw new Error(`Research prompt not found for type: ${type}`);
  }

  // プロバイダー決定
  const provider = resolveProvider(undefined, RESEARCH_PROJECT_CODES[type]);

  // クライアント初期化
  const client = new GrokClient(provider);

  // メッセージ構築
  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { 
      role: 'user', 
      content: createResearchQuery(query, options) 
    },
  ];

  // API呼び出し
  const response = await client.chat(messages);

  return {
    content: response.content,
    usage: response.usage ?? null,
  };
}

/**
 * ストリーミングリサーチ
 */
export async function* streamResearch(
  request: ResearchRequest
): AsyncIterable<string> {
  const { type, query, options = {} } = request;

  const promptKey = RESEARCH_PROMPT_KEYS[type];
  const systemPrompt = await getPromptFromDB(promptKey);
  
  if (!systemPrompt) {
    throw new Error(`Research prompt not found for type: ${type}`);
  }

  const provider = resolveProvider(undefined, RESEARCH_PROJECT_CODES[type]);
  const client = new GrokClient(provider);

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { 
      role: 'user', 
      content: createResearchQuery(query, options) 
    },
  ];

  yield* client.stream(messages);
}

/**
 * リサーチクエリ作成
 */
function createResearchQuery(
  query: string, 
  options: ResearchRequest['options']
): string {
  let fullQuery = query;

  if (options?.includeX) {
    fullQuery += '\n\n※X(Twitter)上の情報も含めて検索してください。';
  }

  if (options?.includeWeb) {
    fullQuery += '\n\n※最新のWeb情報も検索してください。';
  }

  if (options?.maxResults) {
    fullQuery += `\n\n※結果は最大${options.maxResults}件に絞ってください。`;
  }

  return fullQuery;
}
```

#### タスク 2.1.2: リサーチAPIエンドポイント

**ファイル**: `app/api/research/route.ts` (新規)

```typescript
/**
 * リサーチAPI
 * 
 * POST /api/research
 * 各種リサーチを実行
 * 
 * GET /api/research/stream
 * リサーチ結果をストリーミング
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { executeResearch, streamResearch } from '@/lib/research/service';
import { createApiHandler } from '@/lib/api/handler';

const researchSchema = z.object({
  type: z.enum(['cast', 'location', 'info', 'evidence']),
  query: z.string().min(1, '検索クエリを入力してください'),
  options: z.object({
    includeX: z.boolean().optional(),
    includeWeb: z.boolean().optional(),
    maxResults: z.number().min(1).max(20).optional(),
  }).optional(),
});

export type ResearchRequest = z.infer<typeof researchSchema>;

/**
 * POST /api/research
 * 通常のリサーチ（非ストリーミング）
 */
export const POST = createApiHandler(
  async ({ data }) => {
    const response = await executeResearch(data);
    return NextResponse.json({
      success: true,
      data: response,
    });
  },
  { schema: researchSchema }
);

/**
 * GET /api/research/stream
 * ストリーミングリサーチ
 * 
 * Query Parameters:
 * - type: cast | location | info | evidence
 * - query: string
 * - includeX: boolean (optional)
 * - includeWeb: boolean (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type') as 'cast' | 'location' | 'info' | 'evidence';
    const query = searchParams.get('query');
    const includeX = searchParams.get('includeX') === 'true';
    const includeWeb = searchParams.get('includeWeb') === 'true';

    if (!type || !query) {
      return NextResponse.json(
        { success: false, error: 'typeとqueryは必須です' },
        { status: 400 }
      );
    }

    const stream = streamResearch({
      type,
      query,
      options: { includeX, includeWeb },
    });

    // ReadableStreamに変換
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Research stream error:', error);
    return NextResponse.json(
      { success: false, error: 'リサーチに失敗しました' },
      { status: 500 }
    );
  }
}
```

---

### 3.2 Day 3-4: リサーチページ実装

#### タスク 2.2.1: リサーチチャットコンポーネント

**ファイル**: `components/ui/ResearchChat.tsx` (新規)

```typescript
/**
 * リサーチ専用チャットコンポーネント
 * 検索オプション付き
 */

'use client';

import { useState } from 'react';
import { FeatureChat } from './FeatureChat';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, Globe, Twitter } from 'lucide-react';
import type { GemId } from '@/lib/chat/gems';

interface ResearchChatProps {
  gemId: Extract<GemId, 'research-cast' | 'research-location' | 'research-info' | 'research-evidence'>;
}

export function ResearchChat({ gemId }: ResearchChatProps) {
  const [includeX, setIncludeX] = useState(false);
  const [includeWeb, setIncludeWeb] = useState(true);

  const getIcon = () => {
    switch (gemId) {
      case 'research-cast':
        return <Twitter className="h-4 w-4" />;
      case 'research-location':
      case 'research-info':
        return <Globe className="h-4 w-4" />;
      case 'research-evidence':
        return <Search className="h-4 w-4" />;
    }
  };

  const getSearchLabel = () => {
    switch (gemId) {
      case 'research-cast':
        return 'X(Twitter)検索を含める';
      case 'research-evidence':
        return '情報源を明示する';
      default:
        return 'Web検索を含める';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 検索オプション */}
      <div className="px-4 py-3 border-b bg-muted/50">
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="include-web"
              checked={includeWeb}
              onCheckedChange={setIncludeWeb}
            />
            <Label htmlFor="include-web" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Web検索を含める
            </Label>
          </div>
          
          {gemId === 'research-cast' && (
            <div className="flex items-center space-x-2">
              <Switch
                id="include-x"
                checked={includeX}
                onCheckedChange={setIncludeX}
              />
              <Label htmlFor="include-x" className="flex items-center gap-2">
                <Twitter className="h-4 w-4" />
                X(Twitter)検索
              </Label>
            </div>
          )}
        </div>
      </div>

      {/* チャットエリア */}
      <div className="flex-1">
        <FeatureChat
          gemId={gemId}
          enableFileUpload={true}
        />
      </div>
    </div>
  );
}
```

#### タスク 2.2.2: 各リサーチページ

**ファイル**: `app/(authenticated)/research/cast/page.tsx` (新規)

```typescript
/**
 * 出演者リサーチページ
 */

import { ResearchChat } from '@/components/ui/ResearchChat';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '出演者リサーチ | AD Production AI Hub',
  description: '企画に最適な出演者候補をリサーチ',
};

export default function ResearchCastPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <ResearchChat gemId="research-cast" />
    </div>
  );
}
```

**ファイル**: `app/(authenticated)/research/location/page.tsx` (新規)

```typescript
/**
 * 場所リサーチページ
 */

import { ResearchChat } from '@/components/ui/ResearchChat';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '場所リサーチ | AD Production AI Hub',
  description: 'ロケ地候補と撮影条件を調査',
};

export default function ResearchLocationPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <ResearchChat gemId="research-location" />
    </div>
  );
}
```

**ファイル**: `app/(authenticated)/research/info/page.tsx` (新規)

```typescript
/**
 * 情報リサーチページ
 */

import { ResearchChat } from '@/components/ui/ResearchChat';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '情報リサーチ | AD Production AI Hub',
  description: 'テーマに関する情報を収集・整理',
};

export default function ResearchInfoPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <ResearchChat gemId="research-info" />
    </div>
  );
}
```

**ファイル**: `app/(authenticated)/research/evidence/page.tsx` (新規)

```typescript
/**
 * エビデンスリサーチページ
 */

import { ResearchChat } from '@/components/ui/ResearchChat';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'エビデンスリサーチ | AD Production AI Hub',
  description: '企画の裏付けとなるエビデンスを収集',
};

export default function ResearchEvidencePage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <ResearchChat gemId="research-evidence" />
    </div>
  );
}
```

---

### 3.3 Day 5: リサーチ機能テスト

#### タスク 2.3.1: テストケース

**ファイル**: `tests/research.test.ts` (新規)

```typescript
/**
 * リサーチ機能テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeResearch, type ResearchRequest } from '@/lib/research/service';

// モック
ci.mock('@/lib/llm/clients/grok', () => ({
  GrokClient: class MockGrokClient {
    async chat() {
      return {
        content: 'モックレスポンス',
        usage: { inputTokens: 100, outputTokens: 50, cost: 0.001 },
      };
    }
    async *stream() {
      yield 'モック';
      yield 'レスポンス';
    }
  },
}));

describe('Research Service', () => {
  it('出演者リサーチを実行できる', async () => {
    const request: ResearchRequest = {
      type: 'cast',
      query: 'アジフライ好きなタレント',
      options: { includeX: true },
    };

    const response = await executeResearch(request);
    
    expect(response.content).toBeDefined();
    expect(response.usage).toBeDefined();
  });

  it('場所リサーチを実行できる', async () => {
    const request: ResearchRequest = {
      type: 'location',
      query: '東京都内のレトロな喫茶店',
    };

    const response = await executeResearch(request);
    
    expect(response.content).toBeDefined();
  });

  it('エビデンスリサーチで情報源を含める', async () => {
    const request: ResearchRequest = {
      type: 'evidence',
      query: 'アジフライの人気度統計',
    };

    const response = await executeResearch(request);
    
    expect(response.content).toBeDefined();
  });
});
```

---

## 4. Week 3: 新企画立案 & UI整備

### 4.1 Day 1-2: 新企画立案機能改善

#### タスク 3.1.1: プロポーザルサービス

**ファイル**: `lib/proposal/service.ts` (新規)

```typescript
/**
 * 新企画立案サービス
 */

import { GrokClient } from '@/lib/llm/clients/grok';
import { getPromptFromDB, PROMPT_KEYS } from '@/lib/prompts/db';
import type { LLMMessage } from '@/lib/llm/types';
import { resolveProvider } from '@/lib/llm/utils';

export interface ProposalRequest {
  programInfo: string;      // 番組情報
  theme: string;            // テーマ
  targetAudience?: string;  // 対象視聴者
  duration?: string;        // 尺
  budget?: string;          // 予算
  numProposals?: number;    // 生成案数（デフォルト3）
}

export interface ProposalResponse {
  proposals: {
    title: string;
    concept: string;
    structure: string;
    cast: string[];
    location: string;
    highlight: string;
  }[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  } | null;
}

/**
 * 企画案を生成
 */
export async function generateProposals(
  request: ProposalRequest
): Promise<ProposalResponse> {
  const {
    programInfo,
    theme,
    targetAudience,
    duration,
    budget,
    numProposals = 3,
  } = request;

  // プロンプト取得
  const systemPrompt = await getPromptFromDB(PROMPT_KEYS.PROPOSAL);
  
  if (!systemPrompt) {
    throw new Error('Proposal prompt not found');
  }

  // プロバイダー決定
  const provider = resolveProvider(undefined, 'PJ-D');
  const client = new GrokClient(provider);

  // ユーザークエリ作成
  const userQuery = createProposalQuery({
    programInfo,
    theme,
    targetAudience,
    duration,
    budget,
    numProposals,
  });

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userQuery },
  ];

  const response = await client.chat(messages);

  // レスポンスをパース
  const proposals = parseProposalResponse(response.content, numProposals);

  return {
    proposals,
    usage: response.usage ?? null,
  };
}

/**
 * クエリ作成
 */
function createProposalQuery(params: {
  programInfo: string;
  theme: string;
  targetAudience?: string;
  duration?: string;
  budget?: string;
  numProposals: number;
}): string {
  let query = `以下の条件で新企画を${params.numProposals}案提案してください。\n\n`;
  
  query += `【番組情報】\n${params.programInfo}\n\n`;
  query += `【テーマ】\n${params.theme}\n\n`;
  
  if (params.targetAudience) {
    query += `【対象視聴者】\n${params.targetAudience}\n\n`;
  }
  
  if (params.duration) {
    query += `【尺】\n${params.duration}\n\n`;
  }
  
  if (params.budget) {
    query += `【予算】\n${params.budget}\n\n`;
  }

  return query;
}

/**
 * レスポンスパース
 * AIの出力を構造化データに変換
 */
function parseProposalResponse(
  content: string,
  expectedCount: number
): ProposalResponse['proposals'] {
  // 簡易パース: "案1:" "案2:" で分割
  const proposals: ProposalResponse['proposals'] = [];
  
  for (let i = 1; i <= expectedCount; i++) {
    const pattern = new RegExp(`案${i}[:：]\\s*([^]+?)(?=案${i + 1}[:：]|$)`, 'i');
    const match = content.match(pattern);
    
    if (match) {
      const section = match[1].trim();
      proposals.push({
        title: extractField(section, 'タイトル|タイトル案'),
        concept: extractField(section, 'コンセプト|企画概要'),
        structure: extractField(section, '構成|ストーリー'),
        cast: extractList(section, '出演者|キャスト'),
        location: extractField(section, 'ロケ地|場所'),
        highlight: extractField(section, '見どころ|ポイント'),
      });
    }
  }

  // パース失敗時は全体を1案として返す
  if (proposals.length === 0) {
    proposals.push({
      title: '企画案',
      concept: content,
      structure: '',
      cast: [],
      location: '',
      highlight: '',
    });
  }

  return proposals;
}

function extractField(text: string, fieldNames: string): string {
  const pattern = new RegExp(`(?:${fieldNames})[:：]\\s*([^\\n]+)`, 'i');
  const match = text.match(pattern);
  return match ? match[1].trim() : '';
}

function extractList(text: string, fieldNames: string): string[] {
  const pattern = new RegExp(`(?:${fieldNames})[:：]\\s*([^]+?)(?=\\n\\n|\\n[^•\\-\\d]|$)`, 'i');
  const match = text.match(pattern);
  
  if (!match) return [];
  
  return match[1]
    .split(/[\\n,、]/)
    .map(item => item.replace(/^[•\\-\\d.\\)\\）]\\s*/, '').trim())
    .filter(Boolean);
}
```

#### タスク 3.1.2: プロポーザルAPI

**ファイル**: `app/api/proposal/route.ts` (新規)

```typescript
/**
 * 新企画立案API
 * 
 * POST /api/proposal
 * 企画案を生成
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateProposals } from '@/lib/proposal/service';
import { createApiHandler } from '@/lib/api/handler';

const proposalSchema = z.object({
  programInfo: z.string().min(1, '番組情報を入力してください'),
  theme: z.string().min(1, 'テーマを入力してください'),
  targetAudience: z.string().optional(),
  duration: z.string().optional(),
  budget: z.string().optional(),
  numProposals: z.number().min(1).max(5).default(3),
});

export type ProposalRequest = z.infer<typeof proposalSchema>;

/**
 * POST /api/proposal
 */
export const POST = createApiHandler(
  async ({ data }) => {
    const response = await generateProposals(data);
    return NextResponse.json({
      success: true,
      data: response,
    });
  },
  { schema: proposalSchema }
);
```

#### タスク 3.1.3: プロポーザル入力フォーム

**ファイル**: `components/ui/ProposalForm.tsx` (新規)

```typescript
/**
 * 新企画立案フォーム
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import type { ProposalRequest } from '@/app/api/proposal/route';

interface ProposalFormProps {
  onSubmit: (data: ProposalRequest) => void;
  isLoading: boolean;
}

export function ProposalForm({ onSubmit, isLoading }: ProposalFormProps) {
  const [formData, setFormData] = useState<ProposalRequest>({
    programInfo: '',
    theme: '',
    targetAudience: '',
    duration: '',
    budget: '',
    numProposals: 3,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.programInfo.trim() || !formData.theme.trim()) {
      toast.error('番組情報とテーマは必須です');
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* 番組情報 */}
          <div className="space-y-2">
            <Label htmlFor="programInfo">
              番組情報 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="programInfo"
              placeholder="例：全国ネットの情報番組。平日午後3時放送。30分枠。"
              value={formData.programInfo}
              onChange={(e) => setFormData({ ...formData, programInfo: e.target.value })}
              rows={3}
              required
            />
          </div>

          {/* テーマ */}
          <div className="space-y-2">
            <Label htmlFor="theme">
              企画テーマ <span className="text-destructive">*</span>
            </Label>
            <Input
              id="theme"
              placeholder="例：ご当地グルメ特集"
              value={formData.theme}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              required
            />
          </div>

          {/* オプション項目 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetAudience">対象視聴者</Label>
              <Input
                id="targetAudience"
                placeholder="例：30-50代女性"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">尺</Label>
              <Input
                id="duration"
                placeholder="例：10分"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">予算</Label>
              <Input
                id="budget"
                placeholder="例：50万円"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              />
            </div>
          </div>

          {/* 生成案数 */}
          <div className="space-y-2">
            <Label>生成する企画案数</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant={formData.numProposals === num ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, numProposals: num })}
                >
                  {num}案
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            企画案を生成中...
          </>
        ) : (
          <>
            <Lightbulb className="mr-2 h-4 w-4" />
            企画案を生成
          </>
        )}
      </Button>
    </form>
  );
}
```

#### タスク 3.1.4: プロポーザル結果表示

**ファイル**: `components/ui/ProposalResults.tsx` (新規)

```typescript
/**
 * 企画案結果表示コンポーネント
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WordExportButton } from './WordExportButton';
import { Users, MapPin, Star, FileText } from 'lucide-react';
import type { ProposalResponse } from '@/lib/proposal/service';

interface ProposalResultsProps {
  proposals: ProposalResponse['proposals'];
}

export function ProposalResults({ proposals }: ProposalResultsProps) {
  const getAllContent = () => {
    return proposals.map((p, i) => `
## 案${i + 1}: ${p.title}

**コンセプト**
${p.concept}

**構成**
${p.structure}

**出演者**
${p.cast.join('、')}

**ロケ地**
${p.location}

**見どころ**
${p.highlight}
`).join('\n---\n');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">生成された企画案</h2>
        <WordExportButton
          content={getAllContent()}
          filename={`企画案_${new Date().toISOString().split('T')[0]}`}
          title="新企画立案"
        />
      </div>

      <div className="grid gap-6">
        {proposals.map((proposal, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">案 {index + 1}</Badge>
              </div>
              <CardTitle className="text-xl mt-2">{proposal.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* コンセプト */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  コンセプト
                </h4>
                <p className="text-sm">{proposal.concept}</p>
              </div>

              {/* 構成 */}
              {proposal.structure && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    構成
                  </h4>
                  <p className="text-sm whitespace-pre-line">{proposal.structure}</p>
                </div>
              )}

              {/* メタ情報 */}
              <div className="flex flex-wrap gap-4 pt-4 border-t">
                {proposal.cast.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{proposal.cast.join('、')}</span>
                  </div>
                )}
                
                {proposal.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{proposal.location}</span>
                  </div>
                )}
                
                {proposal.highlight && (
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span>{proposal.highlight}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

#### タスク 3.1.5: プロポーザルページ

**ファイル**: `app/(authenticated)/proposal/page.tsx` (新規)

```typescript
/**
 * 新企画立案ページ
 */

'use client';

import { useState } from 'react';
import { ProposalForm } from '@/components/ui/ProposalForm';
import { ProposalResults } from '@/components/ui/ProposalResults';
import type { ProposalRequest } from '@/app/api/proposal/route';
import type { ProposalResponse } from '@/lib/proposal/service';
import { toast } from 'sonner';

export default function ProposalPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProposalResponse | null>(null);

  const handleSubmit = async (data: ProposalRequest) => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || '企画案の生成に失敗しました');
      }

      setResult(json.data);
      toast.success(`${json.data.proposals.length}案の企画を生成しました`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'エラーが発生しました';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">新企画立案</h1>
        <p className="text-muted-foreground mt-2">
          番組情報とテーマを入力すると、AIが企画案を複数提案します
        </p>
      </div>

      <div className="space-y-8">
        <ProposalForm onSubmit={handleSubmit} isLoading={isLoading} />
        
        {result && (
          <ProposalResults proposals={result.proposals} />
        )}
      </div>
    </div>
  );
}
```

---

### 4.2 Day 3-4: UI/UX改善

#### タスク 3.2.1: サイドバー改善

**ファイル**: `components/layout/Sidebar.tsx` (既存改修)

```typescript
// リサーチ機能のサブメニュー展開

const researchItems = [
  { id: 'research-cast', name: '出演者リサーチ', href: '/research/cast', icon: Users },
  { id: 'research-location', name: '場所リサーチ', href: '/research/location', icon: MapPin },
  { id: 'research-info', name: '情報リサーチ', href: '/research/info', icon: Search },
  { id: 'research-evidence', name: 'エビデンスリサーチ', href: '/research/evidence', icon: Shield },
];

// AccordionまたはCollapsibleでリサーチメニューを展開
```

#### タスク 3.2.2: オンボーディング

**ファイル**: `components/ui/Onboarding.tsx` (新規)

```typescript
/**
 * オンボーディングコンポーネント
 * 初回利用時のガイド表示
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const ONBOARDING_STEPS = [
  {
    title: 'ようこそ',
    description: 'AD Production AI Hubは、テレビ制作の効率化を支援するAIツールです。',
  },
  {
    title: '議事録作成',
    description: 'Zoomの文字起こしから、整形された議事録を自動生成できます。',
  },
  {
    title: 'NA原稿作成',
    description: 'Premiere Proの書き起こしテキストから、ナレーション原稿を作成します。',
  },
  {
    title: 'リサーチ機能',
    description: '出演者、場所、情報、エビデンスの4種類のリサーチを利用できます。',
  },
];

export function Onboarding() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useLocalStorage(
    'has-seen-onboarding',
    false
  );
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, [hasSeenOnboarding]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setHasSeenOnboarding(true);
    setIsOpen(false);
  };

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center gap-1 py-4">
          {ONBOARDING_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full ${
                index === currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="ghost" onClick={handleComplete}>
            スキップ
          </Button>
          <Button onClick={handleNext}>
            {currentStep === ONBOARDING_STEPS.length - 1 ? '始める' : '次へ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### 4.3 Day 5: 統合テスト

#### タスク 3.3.1: エンドツーエンドテスト

**ファイル**: `tests/e2e/workflow.test.ts` (新規)

```typescript
/**
 * エンドツーエンドワークフローテスト
 */

import { test, expect } from '@playwright/test';

test.describe('主要ワークフロー', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン
    await page.goto('/login');
    // ... ログイン処理
  });

  test('議事録作成フロー', async ({ page }) => {
    await page.goto('/meeting-notes');
    
    // ファイルアップロード
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/sample.vtt');
    
    // AI処理実行
    await page.click('button:has-text("議事録を作成")');
    
    // 結果表示確認
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
    
    // Word出力
    await page.click('button:has-text("Wordで保存")');
    // ダウンロード確認
  });

  test('リサーチフロー', async ({ page }) => {
    await page.goto('/research/cast');
    
    // クエリ入力
    await page.fill('textarea', 'アジフライ好きなタレント');
    
    // 検索オプション
    await page.click('label:has-text("X(Twitter)検索")');
    
    // 実行
    await page.click('button:has-text("検索")');
    
    // 結果確認
    await expect(page.locator('[data-testid="chat-message"]')).toBeVisible();
  });
});
```

---

## 5. Week 4: 最終調整 & リリース

### 5.1 Day 1-3: バグ修正 & 最適化

#### タスク 4.1.1: バグ修正リスト

```markdown
## 優先度高
- [ ] ファイルアップロード時の文字化け
- [ ] Word出力のテーブル変換エラー
- [ ] ストリーミングレスポンスの切断
- [ ] 認証セッション切れ時の挙動

## 優先度中
- [ ] モバイル表示の崩れ
- [ ] ダークモード対応
- [ ] エラーメッセージの改善
- [ ] ローディング状態の統一
```

#### タスク 4.1.2: パフォーマンス最適化

```typescript
// next.config.tsに追加
const nextConfig = {
  // ... 既存設定
  
  // 画像最適化
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 60,
  },
  
  // 圧縮
  compress: true,
  
  // 実験的機能
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};
```

### 5.2 Day 4-5: リリース準備

#### タスク 4.2.1: リリースチェックリスト

```markdown
## 環境構築
- [ ] 本番環境変数設定
- [ ] データベースマイグレーション実行
- [ ] SSL証明書確認

## 監視設定
- [ ] Sentryエラー監視
- [ ] Vercel Analytics
- [ ] カスタムダッシュボード

## ドキュメント
- [ ] README更新
- [ ] ユーザーマニュアル
- [ ] トラブルシューティングガイド

## リリース
- [ ] 最終テスト完了
- [ ] バックアップ作成
- [ ] リリースノート作成
- [ ] ステークホルダー通知
```

---

## 6. 技術仕様詳細

### 6.1 API仕様

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/export/word` | POST | Markdown → Word変換 |
| `/api/upload` | POST | ファイルアップロード |
| `/api/research` | POST | リサーチ実行 |
| `/api/research/stream` | GET | リサーチストリーミング |
| `/api/proposal` | POST | 企画案生成 |

### 6.2 データベーススキーマ

```prisma
// SystemPromptテーブル（既存）
model SystemPrompt {
  id          String   @id @default(cuid())
  key         String   @unique
  name        String
  description String?
  content     String
  category    String   // general, minutes, transcript, research, proposal
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// 追加検討
model ResearchCache {
  id        String   @id @default(cuid())
  query     String
  type      String
  result    String
  createdAt DateTime @default(now())
  expiresAt DateTime
}
```

### 6.3 依存関係図

```
components/ui/FeatureChat.tsx
├── hooks/useLLMStream.ts
├── components/ui/WordExportButton.tsx
│   └── hooks/useWordExport.ts
│       └── app/api/export/word/route.ts
│           └── lib/export/word-generator.ts
├── components/ui/FileUpload.tsx
│   └── hooks/useFileUpload.ts
│       └── app/api/upload/route.ts
│           └── lib/upload/file-parser.ts
└── lib/chat/gems.ts

app/(authenticated)/research/*/page.tsx
└── components/ui/ResearchChat.tsx
    └── components/ui/FeatureChat.tsx
        └── lib/research/service.ts
            └── app/api/research/route.ts

app/(authenticated)/proposal/page.tsx
├── components/ui/ProposalForm.tsx
├── components/ui/ProposalResults.tsx
└── lib/proposal/service.ts
    └── app/api/proposal/route.ts
```

---

**次回更新**: 毎週金曜日  
**担当**: 浅野宏耀（開発）/ 井上直也（PM）  
**レビュー**: 週次スプリントレビュー
