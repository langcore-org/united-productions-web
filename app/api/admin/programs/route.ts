/**
 * 番組情報管理API
 * 
 * GET /api/admin/programs - 番組一覧取得
 * GET /api/admin/programs?id={id} - 特定番組取得
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { programs, getProgramById } from "@/lib/knowledge/programs";
import type { ProgramInfo } from "@/lib/knowledge/types";

/**
 * 番組情報を安全にシリアライズ（関数を除外）
 */
function serializeProgram(program: ProgramInfo): Record<string, unknown> {
  return {
    id: program.id,
    name: program.name,
    nameEn: program.nameEn,
    station: program.station,
    schedule: program.schedule,
    scheduleDetail: program.scheduleDetail,
    timeSlot: program.timeSlot,
    officialUrl: program.officialUrl,
    cast: program.cast,
    regularCast: program.regularCast,
    narrator: program.narrator,
    announcer: program.announcer,
    staff: program.staff,
    chiefDirector: program.chiefDirector,
    producers: program.producers,
    directors: program.directors,
    description: program.description,
    concept: program.concept,
    targetAudience: program.targetAudience,
    corners: program.corners,
    format: program.format,
    startDate: program.startDate,
    startDateText: program.startDateText,
    regularStartDate: program.regularStartDate,
    totalEpisodes: program.totalEpisodes,
    broadcastHistory: program.broadcastHistory,
    ratings: program.ratings,
    awards: program.awards,
    achievements: program.achievements,
    social: program.social,
    youtubeChannel: program.youtubeChannel,
    twitter: program.twitter,
    instagram: program.instagram,
    tiktok: program.tiktok,
    sponsors: program.sponsors,
    productionCooperation: program.productionCooperation,
    notes: program.notes,
    relatedPrograms: program.relatedPrograms,
    spinoffs: program.spinoffs,
    pastSpecials: program.pastSpecials,
    tags: program.tags,
    genre: program.genre,
    category: program.category,
  };
}

/**
 * GET /api/admin/programs
 * 
 * クエリパラメータ:
 * - id: 特定の番組ID（省略時は全番組）
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 管理者認証
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      // 特定番組の取得
      const program = getProgramById(id);
      if (!program) {
        return NextResponse.json(
          { error: "番組が見つかりません", id },
          { status: 404 }
        );
      }

      return NextResponse.json({
        program: serializeProgram(program),
      });
    }

    // 全番組一覧の取得
    const serializedPrograms = programs.map(serializeProgram);

    return NextResponse.json({
      programs: serializedPrograms,
      total: serializedPrograms.length,
    });
  } catch (error) {
    console.error("Programs API error:", error);
    return NextResponse.json(
      { error: "内部サーバーエラー" },
      { status: 500 }
    );
  }
}
