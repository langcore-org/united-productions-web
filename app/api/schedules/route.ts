/**
 * ロケスケジュール API エンドポイント
 * 
 * エンドポイント:
 * - POST /api/schedules?action=generate - スケジュール自動生成
 * - POST /api/schedules?action=export - エクスポート（Markdown/CSV）
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createGeminiClient } from "@/lib/llm/clients/gemini";
import {
  createScheduleGenerateMessages,
} from "@/prompts/schedule-generate";
import { requireAuth } from "@/lib/api/auth";
import { handleApiError } from "@/lib/api/utils";

/**
 * 生成リクエストスキーマ
 */
const generateRequestSchema = z.object({
  masterSchedule: z.string().min(1, "マスタースケジュールは必須です"),
  type: z.enum(["actor", "staff", "vehicle"] as const),
  additionalInstructions: z.string().optional(),
});

/**
 * エクスポートリクエストスキーマ
 */
const exportRequestSchema = z.object({
  content: z.string().min(1, "コンテンツは必須です"),
  format: z.enum(["markdown", "csv"] as const),
  filename: z.string().optional(),
});

/**
 * POST /api/schedules?action=generate
 * スケジュールを自動生成
 */
async function handleGenerate(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = generateRequestSchema.parse(body);

    // Gemini 2.5 Flash-Lite クライアントを作成
    const client = createGeminiClient("gemini-2.5-flash-lite");

    // プロンプトを作成
    const messages = createScheduleGenerateMessages({
      masterSchedule: validatedData.masterSchedule,
      type: validatedData.type,
      additionalInstructions: validatedData.additionalInstructions,
    });

    // LLMで生成
    const response = await client.chat(messages);

    return NextResponse.json({
      success: true,
      data: {
        content: response.content,
        type: validatedData.type,
        usage: response.usage,
      },
    });
  } catch (error) {
    console.error("Schedule generation error:", error);
    return handleApiError(error);
  }
}

/**
 * POST /api/schedules?action=export
 * スケジュールをエクスポート
 */
async function handleExport(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = exportRequestSchema.parse(body);

    const timestamp = new Date().toISOString().split("T")[0];
    const defaultFilename = `schedule_${timestamp}`;
    const filename = validatedData.filename || defaultFilename;

    let content = validatedData.content;
    let contentType: string;
    let fileExtension: string;

    if (validatedData.format === "csv") {
      // MarkdownテーブルをCSVに変換
      content = markdownTableToCsv(content);
      contentType = "text/csv; charset=utf-8";
      fileExtension = "csv";
    } else {
      contentType = "text/markdown; charset=utf-8";
      fileExtension = "md";
    }

    // BOMを追加してExcelで文字化けしないようにする
    const bom = "\uFEFF";
    const fullContent = bom + content;

    return new NextResponse(fullContent, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}.${fileExtension}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return handleApiError(error);
  }
}

/**
 * MarkdownテーブルをCSVに変換
 * @param markdown - Markdown形式のテーブル
 * @returns CSV形式の文字列
 */
function markdownTableToCsv(markdown: string): string {
  const lines = markdown.split("\n");
  const csvLines: string[] = [];

  for (const line of lines) {
    // テーブル行を検出
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      // 区切り行（---|---）をスキップ
      if (trimmed.includes("---")) {
        continue;
      }

      // セルを分割してCSV形式に変換
      const cells = trimmed
        .slice(1, -1) // 先頭と末尾の | を削除
        .split("|")
        .map((cell) => cell.trim())
        .map((cell) => {
          // カンマや改行を含む場合はクォートで囲む
          if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        });

      csvLines.push(cells.join(","));
    }
  }

  return csvLines.join("\n");
}

/**
 * メインのPOSTハンドラ
 * アクションによって処理を振り分け
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  switch (action) {
    case "generate":
      return handleGenerate(request);
    case "export":
      return handleExport(request);
    default:
      return NextResponse.json(
        {
          success: false,
          error: "無効なアクションです",
          validActions: ["generate", "export"],
        },
        { status: 400 }
      );
  }
}

/**
 * GET /api/schedules
 * ヘルスチェック用
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Schedule API is running",
    endpoints: {
      "POST /api/schedules?action=generate": "スケジュール自動生成",
      "POST /api/schedules?action=export": "スケジュールエクスポート",
    },
  });
}
