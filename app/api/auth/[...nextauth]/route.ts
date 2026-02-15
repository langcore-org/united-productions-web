/**
 * NextAuth.js API Route
 * AI Hub - United Productions 制作支援統合プラットフォーム
 * 
 * App Router形式でのNextAuth.js実装
 * パス: /api/auth/[...nextauth]
 */

import NextAuth from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

/**
 * NextAuth.js ハンドラー
 * GET, POST リクエストを処理
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
