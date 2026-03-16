/**
 * Admin Users API（Supabase版）
 *
 * GET /api/admin/users - ユーザー一覧取得
 */

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface UserUsage {
  meetingNotes: number;
  transcripts: number;
  researchChats: number;
  total: number;
}

interface UserData {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  usage: UserUsage;
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const supabase = createAdminClient();

    let query = supabase
      .from("users")
      .select("id, email, name, image, role, created_at, updated_at", { count: "exact" });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const {
      data: users,
      count: total,
      error,
    } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    if (error) throw error;

    // 各ユーザーの利用統計を取得
    const userIds = (users || []).map((u) => u.id);
    const usageData: Record<string, UserUsage> = {};

    if (userIds.length > 0) {
      // meeting_notesのカウント
      const { data: meetingNotesData, error: meetingError } = await supabase
        .from("meeting_notes")
        .select("user_id")
        .in("user_id", userIds);

      if (meetingError) throw meetingError;

      // chatsのカウント（リサーチチャット）
      const { data: chatsData, error: chatsError } = await supabase
        .from("chats")
        .select("user_id")
        .in("user_id", userIds);

      if (chatsError) throw chatsError;

      // カウント集計
      const meetingNotesCount: Record<string, number> = {};
      const researchChatsCount: Record<string, number> = {};

      for (const note of meetingNotesData || []) {
        meetingNotesCount[note.user_id] = (meetingNotesCount[note.user_id] || 0) + 1;
      }

      for (const chat of chatsData || []) {
        researchChatsCount[chat.user_id] = (researchChatsCount[chat.user_id] || 0) + 1;
      }

      // usageデータの構築
      for (const userId of userIds) {
        const meetingNotes = meetingNotesCount[userId] || 0;
        const researchChats = researchChatsCount[userId] || 0;
        // transcriptsは現在未使用
        const transcripts = 0;

        usageData[userId] = {
          meetingNotes,
          transcripts,
          researchChats,
          total: meetingNotes + transcripts + researchChats,
        };
      }
    }

    // スネークケース→キャメルケースに変換
    const formattedUsers: UserData[] = (users || []).map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      usage: usageData[user.id] || {
        meetingNotes: 0,
        transcripts: 0,
        researchChats: 0,
        total: 0,
      },
    }));

    return NextResponse.json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          total: total || 0,
          limit,
          offset,
          hasMore: offset + (users?.length || 0) < (total || 0),
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
  }
}
