/**
 * Admin Prompts API（Supabase版）
 *
 * GET /api/admin/prompts - 全プロンプト一覧取得
 * PUT /api/admin/prompts?key=xxx - プロンプト更新
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";

const updatePromptSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const key = searchParams.get("key");

    if (key) {
      const { data: prompt, error } = await supabase
        .from("system_prompts")
        .select("*")
        .eq("key", key)
        .single();

      if (error || !prompt) {
        return NextResponse.json({ success: false, error: "Prompt not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: prompt });
    }

    let query = supabase
      .from("system_prompts")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    const { data: prompts, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: prompts || [] });
  } catch (error) {
    console.error("Failed to fetch prompts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Failed to fetch prompts", details: errorMessage },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Key parameter is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validatedData = updatePromptSchema.parse(body);

    const supabase = await createClient();
    const { data: updatedPrompt, error } = await supabase
      .from("system_prompts")
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq("key", key)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: updatedPrompt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Failed to update prompt:", error);
    return NextResponse.json({ success: false, error: "Failed to update prompt" }, { status: 500 });
  }
}
