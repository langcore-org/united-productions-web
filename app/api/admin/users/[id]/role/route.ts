/**
 * Admin User Role API（Supabase版）
 *
 * PATCH /api/admin/users/:id/role - ユーザー権限更新
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { errorResponse, validationErrorResponse } from "@/lib/api/utils";
import { createAdminClient } from "@/lib/supabase/admin";

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "USER"]),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;

    const body = await request.json();
    const validationResult = updateRoleSchema.safeParse(body);

    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error);
    }

    const { role } = validationResult.data;
    const supabase = createAdminClient();

    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id, email, name")
      .eq("id", id)
      .single();

    if (fetchError || !user) {
      return errorResponse("ユーザーが見つかりません", 404);
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ role })
      .eq("id", id)
      .select("id, email, name, role")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Failed to update user role:", error);
    return errorResponse("Failed to update user role", 500);
  }
}
