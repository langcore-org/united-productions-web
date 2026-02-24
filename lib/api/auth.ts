/**
 * API認証ユーティリティ
 * 
 * API Routesでの認証チェックを共通化します。
 */

import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";

export interface AuthenticatedUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

export interface AuthResult {
  user: AuthenticatedUser;
  userId: string;
}

/**
 * APIリクエストの認証を行う
 * @param req - NextRequestオブジェクト
 * @returns AuthResultまたはNextResponse（エラー時）
 */
export async function requireAuth(
  req: NextRequest
): Promise<AuthResult | NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    const typedSession = session as Session | null;
    if (!typedSession?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      );
    }

    return {
      user: typedSession.user as AuthenticatedUser,
      userId: typedSession.user.id,
    };
  } catch (error) {
    console.error("認証チェックエラー:", error);
    return NextResponse.json(
      { error: "認証処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * オプショナル認証（ログインしていなくても許可）
 * @param req - NextRequestオブジェクト
 * @returns AuthResultまたはnull（未ログイン時）
 */
export async function optionalAuth(
  req: NextRequest
): Promise<AuthResult | null> {
  try {
    const session = await getServerSession(authOptions);
    
    const typedSession = session as Session | null;
    if (!typedSession?.user?.id) {
      return null;
    }

    return {
      user: typedSession.user as AuthenticatedUser,
      userId: typedSession.user.id,
    };
  } catch (error) {
    console.error("認証チェックエラー:", error);
    return null;
  }
}

/**
 * 特定のロールを持つユーザーのみ許可
 * @param req - NextRequestオブジェクト
 * @param allowedRoles - 許可するロールの配列
 * @returns AuthResultまたはNextResponse（エラー時）
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: string[]
): Promise<AuthResult | NextResponse> {
  const authResult = await requireAuth(req);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  // ロールチェック（必要に応じて実装）
  // const userRole = await getUserRole(authResult.userId);
  // if (!allowedRoles.includes(userRole)) {
  //   return NextResponse.json(
  //     { error: "この操作を行う権限がありません" },
  //     { status: 403 }
  //   );
  // }

  return authResult;
}

/**
 * 管理者権限を持つユーザーのみ許可
 * @param req - NextRequestオブジェクト
 * @returns AuthResultまたはNextResponse（エラー時）
 */
export async function requireAdmin(
  req: NextRequest
): Promise<AuthResult | NextResponse> {
  const authResult = await requireAuth(req);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  // 管理者チェック（roleがADMINのユーザーのみ許可）
  const typedSession = await getServerSession(authOptions) as Session | null;
  if (typedSession?.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "この操作を行う権限がありません。管理者のみアクセス可能です。" },
      { status: 403 }
    );
  }

  return authResult;
}
