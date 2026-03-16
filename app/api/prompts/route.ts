/**
 * プロンプト一覧API（Supabase版）
 * GET /api/prompts
 */

import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === "development";
    let authResult: { user: { id: string } } | NextResponse;

    if (isDev) {
      authResult = { user: { id: "dev-user" } };
    } else {
      authResult = await requireAuth(request);
      if (authResult instanceof NextResponse) return authResult;
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let query = supabase
      .from("system_prompts")
      .select("id, key, name, description, category, current_version, updated_at")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    const { data: prompts, error } = await query;
    if (error) throw error;

    // スネークケースからキャメルケースに変換
    const formattedPrompts = (prompts || []).map((prompt) => ({
      id: prompt.id,
      key: prompt.key,
      name: prompt.name,
      description: prompt.description,
      category: prompt.category,
      currentVersion: prompt.current_version,
      updatedAt: prompt.updated_at,
    }));

    return NextResponse.json({ prompts: formattedPrompts });
  } catch (error) {
    console.error("Failed to fetch prompts:", error);
    return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 });
  }
}
