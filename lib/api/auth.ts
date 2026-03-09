/**
 * API認証ユーティリティ（Supabase版）
 *
 * API Routesでの認証チェックを共通化します。
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface AuthenticatedUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string | null;
}

export interface AuthResult {
  user: AuthenticatedUser;
  userId: string;
}

/**
 * APIリクエストの認証を行う
 */
export async function requireAuth(_req: NextRequest): Promise<AuthResult | NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 },
      );
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name ?? null,
        image: user.user_metadata?.avatar_url ?? null,
      },
      userId: user.id,
    };
  } catch (error) {
    console.error("認証チェックエラー:", error);
    return NextResponse.json({ error: "認証処理中にエラーが発生しました" }, { status: 500 });
  }
}

/**
 * オプショナル認証（ログインしていなくても許可）
 */
export async function optionalAuth(_req: NextRequest): Promise<AuthResult | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name ?? null,
        image: user.user_metadata?.avatar_url ?? null,
      },
      userId: user.id,
    };
  } catch (error) {
    console.error("認証チェックエラー:", error);
    return null;
  }
}

/**
 * 特定のロールを持つユーザーのみ許可
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: string[],
): Promise<AuthResult | NextResponse> {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const supabase = await createClient();
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", authResult.userId)
    .single();

  if (!userData || !allowedRoles.includes(userData.role)) {
    return NextResponse.json({ error: "この操作を行う権限がありません" }, { status: 403 });
  }

  authResult.user.role = userData.role;
  return authResult;
}

/**
 * 管理者権限を持つユーザーのみ許可
 */
export async function requireAdmin(req: NextRequest): Promise<AuthResult | NextResponse> {
  return requireRole(req, ["ADMIN"]);
}
